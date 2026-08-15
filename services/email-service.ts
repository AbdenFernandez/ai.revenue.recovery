import { assertRole, assertTenantAccess } from "@/lib/auth/authorization";
import { AppError } from "@/lib/errors";
import { memberRepository } from "@/repositories/member-repository";
import { customerRepository } from "@/repositories/customer-repository";
import { suppressionRepository } from "@/repositories/suppression-repository";
import { emailRepository } from "@/repositories/email-repository";
import { EmailProviderFactory } from "@/lib/email/provider-factory";
import {
  generateUnsubscribeToken,
  verifyUnsubscribeToken,
} from "@/lib/email/tokens";
import type {
  EmailDispatchLog,
  EmailMessage,
  SendEmailResult,
  SuppressionReason,
} from "@/types/email";
import type { Customer } from "@/types/customer";
import type {
  EmailWebhookEventInput,
  SendSingleEmailRequestInput,
} from "@/schemas/email";

export class EmailService {
  private async checkTenantAccess(userId: string, businessId: string) {
    const userMemberships = await memberRepository.findByUserId(userId);
    return assertTenantAccess(userMemberships, businessId);
  }

  private async checkAdminOrOwner(userId: string, businessId: string) {
    const userMemberships = await memberRepository.findByUserId(userId);
    return assertRole(userMemberships, businessId, "ADMIN");
  }

  /**
   * Evaluates if a customer should be suppressed from receiving emails.
   */
  async isCustomerSuppressed(
    businessId: string,
    customer: Customer,
  ): Promise<{ isSuppressed: boolean; reason?: SuppressionReason }> {
    if (customer.optOutStatus) {
      return { isSuppressed: true, reason: "UNSUBSCRIBED" };
    }

    if (!customer.consentStatus) {
      return { isSuppressed: true, reason: "NO_CONSENT" };
    }

    const inSuppressionList = await suppressionRepository.isSuppressed(
      businessId,
      customer.email,
    );

    if (inSuppressionList) {
      return { isSuppressed: true, reason: "UNSUBSCRIBED" };
    }

    return { isSuppressed: false };
  }

  /**
   * Dispatches a single transactional or testing email with idempotency and suppression checks.
   */
  async sendSingleEmail(
    userId: string,
    businessId: string,
    input: SendSingleEmailRequestInput,
  ): Promise<SendEmailResult> {
    await this.checkTenantAccess(userId, businessId);

    // 1. Check idempotency
    const existingLog = await emailRepository.findByIdempotencyKey(
      input.idempotencyKey,
    );
    if (existingLog && (existingLog.status === "SENT" || existingLog.status === "DELIVERED")) {
      return {
        success: true,
        messageId: `idempotent_${existingLog.id}`,
        status: existingLog.status,
        timestamp: existingLog.updatedAt,
      };
    }

    // 2. Check global suppression list
    const isSuppressed = await suppressionRepository.isSuppressed(
      businessId,
      input.to,
    );
    if (isSuppressed) {
      return {
        success: false,
        status: "SUPPRESSED",
        error: "Recipient email is on the suppression list.",
        timestamp: new Date().toISOString(),
      };
    }

    // 3. Dispatch via Email Provider
    const provider = EmailProviderFactory.getProvider();
    const message: EmailMessage = {
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text || input.subject,
      replyTo: input.replyTo,
      idempotencyKey: input.idempotencyKey,
      metadata: input.metadata,
    };

    const result = await provider.sendEmail(message);

    return result;
  }

  /**
   * Processes a public 1-click unsubscribe request.
   */
  async processUnsubscribe(
    token: string,
  ): Promise<{ success: boolean; email: string }> {


    const payload = verifyUnsubscribeToken(token);
    if (!payload) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Invalid or expired unsubscribe token.",
      });
    }

    const { businessId, customerId, email } = payload;

    // 1. Add to suppression list
    await suppressionRepository.addSuppression(
      businessId,
      email,
      "UNSUBSCRIBED",
    );

    // 2. Update customer record opt-out status
    const customer = await customerRepository.findById(businessId, customerId);
    if (customer) {
      await customerRepository.update(businessId, customerId, {
        optOutStatus: true,
        consentStatus: false,
      });
    }


    return { success: true, email };
  }

  /**
   * Generates a 1-click unsubscribe URL for a customer.
   */
  getUnsubscribeUrl(
    baseUrl: string,
    businessId: string,
    customerId: string,
    email: string,
  ): string {
    const token = generateUnsubscribeToken(businessId, customerId, email);
    return `${baseUrl}/unsubscribe?token=${encodeURIComponent(token)}`;
  }

  /**
   * Retrieves email dispatch logs for a campaign.
   */
  async getCampaignEmailLogs(
    userId: string,
    businessId: string,
    campaignId: string,
  ): Promise<EmailDispatchLog[]> {
    await this.checkTenantAccess(userId, businessId);
    return emailRepository.listByCampaign(businessId, campaignId);
  }

  /**
   * Handles delivery & open webhook events.
   */
  async handleWebhookEvent(
    event: EmailWebhookEventInput,
  ): Promise<{ success: boolean }> {
    if (event.idempotencyKey) {
      const log = await emailRepository.findByIdempotencyKey(
        event.idempotencyKey,
      );
      if (log) {
        if (event.event === "delivered") {
          await emailRepository.updateStatus(log.id, "DELIVERED", {
            deliveredAt: event.timestamp || new Date().toISOString(),
          });
        } else if (event.event === "opened") {
          await emailRepository.updateStatus(log.id, "OPENED", {
            openedAt: event.timestamp || new Date().toISOString(),
          });
        } else if (event.event === "bounced") {
          await emailRepository.updateStatus(log.id, "BOUNCED", {
            errorMessage: "Bounced by destination mail server",
          });
          await suppressionRepository.addSuppression(
            log.businessId,
            log.recipientEmail,
            "BOUNCED",
          );
        }
      }
    }
    return { success: true };
  }
}

export const emailService = new EmailService();
