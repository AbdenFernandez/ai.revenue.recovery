import { assertRole } from "@/lib/auth/authorization";
import { AppError } from "@/lib/errors";
import { memberRepository } from "@/repositories/member-repository";
import { businessRepository } from "@/repositories/business-repository";
import { customerRepository } from "@/repositories/customer-repository";
import { campaignRepository } from "@/repositories/campaign-repository";
import { emailRepository } from "@/repositories/email-repository";
import { suppressionRepository } from "@/repositories/suppression-repository";
import { EmailProviderFactory } from "@/lib/email/provider-factory";
import {
  compilePersonalizedContent,
  renderEmailHtml,
  renderEmailPlainText,
} from "@/lib/email/templates";
import { generateUnsubscribeToken } from "@/lib/email/tokens";
import { analyzeCustomerOpportunity } from "@/lib/intelligence/scoring-engine";
import type {
  CampaignDispatchSummary,
  EmailDispatchLog,
  EmailMessage,
  SendEmailResult,
} from "@/types/email";
import type { TriggerCampaignDispatchInput } from "@/schemas/email";

export class EmailQueueService {
  private async checkAdminOrOwner(userId: string, businessId: string) {
    const userMemberships = await memberRepository.findByUserId(userId);
    return assertRole(userMemberships, businessId, "ADMIN");
  }

  /**
   * Executes a safe, rate-limited, idempotent email campaign dispatch.
   */
  async dispatchCampaign(
    userId: string,
    businessId: string,
    campaignId: string,
    options: TriggerCampaignDispatchInput = {
      rateLimitPerSecond: 10,
      simulateFailureRate: 0,
    },
  ): Promise<CampaignDispatchSummary> {
    await this.checkAdminOrOwner(userId, businessId);

    // 1. Verify Campaign and Target Variant
    const campaign = await campaignRepository.findById(businessId, campaignId);
    if (!campaign) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Campaign not found.",
      });
    }

    if (campaign.status !== "READY" && campaign.status !== "RUNNING") {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: `Campaign must be in READY or RUNNING status to dispatch emails. Current status: ${campaign.status}`,
      });
    }

    // Set campaign status to RUNNING if it was READY
    if (campaign.status === "READY") {
      await campaignRepository.update(businessId, campaignId, {
        status: "RUNNING",
      });
    }

    const business = await businessRepository.findById(businessId);
    const businessName = business?.name || "Our Business";
    const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const variants = await campaignRepository.getVariants(businessId, campaignId);
    const targetVariant = options.variantId
      ? variants.find((v) => v.id === options.variantId)
      : variants.find((v) => v.isApproved) || variants[0];

    if (!targetVariant) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "No approved message variant found for this campaign.",
      });
    }

    // 2. Fetch Target Audience Customers
    const customerListResult = await customerRepository.list(
      businessId,
      {},
      1,
      1000,
    );


    const allCustomers = customerListResult.items;

    // Filter customers matching campaign's target segment
    const targetCustomers = allCustomers.filter((c) => {
      const opportunity = analyzeCustomerOpportunity(c);
      return opportunity.segment === campaign.targetSegment;
    });

    let sentCount = 0;
    let deliveredCount = 0;
    let failedCount = 0;
    let suppressedCount = 0;
    let duplicatesSkipped = 0;

    const provider = EmailProviderFactory.getProvider();

    // 3. Batch Process with Rate Limiting & Pause Detection
    const chunkSize = Math.max(1, Math.min(options.rateLimitPerSecond, 20));

    for (let i = 0; i < targetCustomers.length; i += chunkSize) {
      // Check if campaign was paused mid-execution
      const freshCampaign = await campaignRepository.findById(
        businessId,
        campaignId,
      );
      if (freshCampaign?.status === "PAUSED") {
        break;
      }

      const chunk = targetCustomers.slice(i, i + chunkSize);

      await Promise.all(
        chunk.map(async (customer) => {
          const idempotencyKey = `cmp_send_${campaignId}_${customer.id}_${targetVariant.id}`;

          // A. Idempotency Check: Avoid sending twice to the same customer
          const existingLog = await emailRepository.findByIdempotencyKey(
            idempotencyKey,
          );
          if (
            existingLog &&
            (existingLog.status === "SENT" ||
              existingLog.status === "DELIVERED" ||
              existingLog.status === "SUPPRESSED")
          ) {
            duplicatesSkipped++;
            return;
          }

          // B. Email Syntax Validation
          const normalizedEmail = customer.email
            ? customer.email.trim().toLowerCase()
            : "";
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!normalizedEmail || !emailRegex.test(normalizedEmail)) {
            failedCount++;
            if (!existingLog) {
              await emailRepository.createLog({
                businessId,
                campaignId,
                customerId: customer.id,
                variantId: targetVariant.id,
                recipientEmail: customer.email || "invalid@missing",
                idempotencyKey,
                status: "FAILED",
                errorMessage:
                  "Invalid or missing recipient email address format",
                retryCount: 0,
                sentAt: null,
                deliveredAt: null,
                openedAt: null,
              });
            }
            return;
          }

          // C. Consent & Suppression Check: Anti-Spam Gate
          const isGlobalSuppressed = await suppressionRepository.isSuppressed(
            businessId,
            normalizedEmail,
          );

          if (
            customer.optOutStatus ||
            !customer.consentStatus ||
            isGlobalSuppressed
          ) {
            suppressedCount++;
            if (!existingLog) {
              await emailRepository.createLog({
                businessId,
                campaignId,
                customerId: customer.id,
                variantId: targetVariant.id,
                recipientEmail: normalizedEmail,

                idempotencyKey,
                status: "SUPPRESSED",
                errorMessage: customer.optOutStatus
                  ? "Customer opted out"
                  : !customer.consentStatus
                    ? "No marketing consent"
                    : "Recipient on global suppression list",
                retryCount: 0,
                sentAt: null,
                deliveredAt: null,
                openedAt: null,
              });
            }
            return;
          }

          // C. Compile Personalized Message
          const customerVariables: Record<string, string> = {
            customer_name: customer.name || "Valued Customer",
            company: customer.company || businessName,
            service_type: customer.serviceType || "services",
            business_name: businessName,
            cta_url: `${appBaseUrl}/dashboard`,
            unsubscribe_url: `${appBaseUrl}/unsubscribe?token=${encodeURIComponent(
              generateUnsubscribeToken(businessId, customer.id, customer.email),
            )}`,
          };

          const personalizedSubject = compilePersonalizedContent(
            targetVariant.subject || `${businessName} Update`,
            customerVariables,
          );

          const personalizedBody = compilePersonalizedContent(
            targetVariant.messageBody,
            customerVariables,
          );

          const templateProps = {
            businessName,
            recipientName: customer.name,
            messageBody: personalizedBody,
            callToAction: targetVariant.callToAction || "Claim Your Offer",
            ctaUrl: `${appBaseUrl}/dashboard`,
            unsubscribeUrl: customerVariables.unsubscribe_url!,
            subject: personalizedSubject,
          };

          const html = renderEmailHtml(templateProps);
          const text = renderEmailPlainText(templateProps);

          const emailMessage: EmailMessage = {
            to: customer.email,
            subject: personalizedSubject,
            html,
            text,
            idempotencyKey,
            metadata: {
              businessId,
              campaignId,
              customerId: customer.id,
              variantId: targetVariant.id,
            },
          };

          // Create or update initial pending log
          let log: EmailDispatchLog;
          if (existingLog) {
            log = existingLog;
          } else {
            log = await emailRepository.createLog({
              businessId,
              campaignId,
              customerId: customer.id,
              variantId: targetVariant.id,
              recipientEmail: customer.email,
              idempotencyKey,
              status: "PENDING",
              errorMessage: null,
              retryCount: 0,
              sentAt: null,
              deliveredAt: null,
              openedAt: null,
            });
          }

          // D. Dispatch with Exponential Backoff Retry (up to 3 attempts)
          let attempt = 0;
          const maxRetries = 3;
          let sendResult: SendEmailResult = {
            success: false,
            status: "FAILED",
            error: "Initial dispatch",
            timestamp: new Date().toISOString(),
          };

          while (attempt < maxRetries) {
            attempt++;
            try {
              sendResult = await provider.sendEmail(emailMessage);
              if (sendResult.success) {
                break;
              }
            } catch (err: unknown) {
              sendResult = {
                success: false,
                status: "FAILED",
                error: err instanceof Error ? err.message : "Provider exception",
                timestamp: new Date().toISOString(),
              };
            }

            // Exponential backoff pause between retries
            if (attempt < maxRetries && !sendResult.success) {
              await new Promise((res) => setTimeout(res, attempt * 50));
            }
          }

          // E. Record Final Status
          if (sendResult.success) {
            sentCount++;
            deliveredCount++;
            await emailRepository.updateStatus(log.id, "DELIVERED", {
              sentAt: sendResult.timestamp,
              deliveredAt: sendResult.timestamp,
              retryCount: attempt - 1,
            });
          } else {
            failedCount++;
            await emailRepository.updateStatus(log.id, "FAILED", {
              errorMessage: sendResult.error || "Failed to dispatch email",
              retryCount: attempt - 1,
            });
          }
        }),
      );

      // Throttling interval if more items remain
      if (i + chunkSize < targetCustomers.length) {
        await new Promise((res) => setTimeout(res, 50));
      }
    }

    // 4. Update Campaign Analytics Scorecard
    const existingAnalytics = await campaignRepository.getAnalytics(
      businessId,
      campaignId,
    );
    if (existingAnalytics) {
      await campaignRepository.updateAnalytics(businessId, campaignId, {
        targeted: targetCustomers.length,
        prepared: targetCustomers.length,
        sent: existingAnalytics.sent + sentCount,
        delivered: existingAnalytics.delivered + deliveredCount,
      });
    }

    return {
      campaignId,
      totalTargeted: targetCustomers.length,
      sentCount,
      deliveredCount,
      failedCount,
      suppressedCount,
      duplicatesSkipped,
      completed: true,
    };
  }
}

export const emailQueueService = new EmailQueueService();
