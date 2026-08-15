import { describe, it, expect, beforeEach } from "vitest";
import { MockEmailProvider } from "@/lib/email/mock-provider";
import { EmailProviderFactory } from "@/lib/email/provider-factory";
import { MemberRepository } from "@/repositories/member-repository";
import { BusinessRepository } from "@/repositories/business-repository";
import { customerRepository } from "@/repositories/customer-repository";
import { campaignRepository } from "@/repositories/campaign-repository";
import { emailRepository } from "@/repositories/email-repository";
import { suppressionRepository } from "@/repositories/suppression-repository";
import { emailQueueService } from "@/services/email-queue";

describe("Email Queue Worker, Retries, and Pause Interruption", () => {
  const businessId = "biz-queue-test";
  const userId = "user-queue-owner";

  beforeEach(async () => {
    emailRepository.clearStore();
    suppressionRepository.clearStore();
    MockEmailProvider.clearSentEmails();
    EmailProviderFactory.resetProvider();
    MemberRepository.clearMocks();
    BusinessRepository.clearMocks();
    customerRepository.clearMocks();
    campaignRepository.clearMocks();

    BusinessRepository.setMock(businessId, {
      id: businessId,
      name: "Queue Test Corp",
      slug: "queue-test-corp",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    MemberRepository.setMock("mem-owner", {
      id: "mem-owner",
      businessId,
      userId,
      role: "OWNER",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  it("dispatches campaign emails to target segment customers and updates analytics", async () => {
    // 1. Create targetable VIP customers (spend >= 5000, frequency >= 4, recent <= 90d)
    await customerRepository.create(businessId, {
      name: "VIP Customer 1",
      email: "vip1@test.com",
      totalPurchaseAmount: 6000,
      purchaseCount: 8,
      lastPurchaseDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      optOutStatus: false,
      consentStatus: true,
    });

    await customerRepository.create(businessId, {
      name: "VIP Customer 2",
      email: "vip2@test.com",
      totalPurchaseAmount: 7500,
      purchaseCount: 10,
      lastPurchaseDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      optOutStatus: false,
      consentStatus: true,
    });

    // 2. Create campaign in READY status
    const campaign = await campaignRepository.create(businessId, {
      name: "VIP Loyalty Special",
      description: "Reward top VIPs",
      targetSegment: "VIP",
      channel: "email",
      audienceCount: 2,
      estimatedOpportunity: 2700,
      strategyRationale: "VIP retention",
    });


    await campaignRepository.update(businessId, campaign.id, {
      status: "READY",
    });

    const variants = await campaignRepository.addVariants(businessId, campaign.id, [
      {
        variantLabel: "Variant A",
        subject: "Exclusive VIP Perk for {{customer_name}}",
        messageBody: "Thank you for being a VIP at {{company}}!",
        callToAction: "Claim Perk",
        tone: "professional",
        isApproved: false,
      },
    ]);

    // Approve variant
    await campaignRepository.approveVariant(
      businessId,
      campaign.id,
      variants[0]!.id,
    );

    // 3. Dispatch emails via queue
    const summary = await emailQueueService.dispatchCampaign(
      userId,
      businessId,
      campaign.id,
      { variantId: variants[0]!.id, rateLimitPerSecond: 10, simulateFailureRate: 0 },
    );

    expect(summary.totalTargeted).toBe(2);
    expect(summary.sentCount).toBe(2);
    expect(summary.deliveredCount).toBe(2);
    expect(summary.failedCount).toBe(0);
    expect(summary.suppressedCount).toBe(0);

    const sent = MockEmailProvider.getSentEmails();
    expect(sent.length).toBe(2);
    expect(sent[0]?.subject).toContain("VIP Perk for VIP Customer");

    // Verify analytics updated
    const analytics = await campaignRepository.getAnalytics(
      businessId,
      campaign.id,
    );
    expect(analytics?.sent).toBe(2);
    expect(analytics?.delivered).toBe(2);
  });

  it("retries transient failures and records retry count", async () => {
    await customerRepository.create(businessId, {
      name: "Retry Customer",
      email: "retry@test.com",
      totalPurchaseAmount: 6000,
      purchaseCount: 8,
      lastPurchaseDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      optOutStatus: false,
      consentStatus: true,
    });

    const campaign = await campaignRepository.create(businessId, {
      name: "VIP Loyalty",
      targetSegment: "VIP",
      channel: "email",
      audienceCount: 1,
      estimatedOpportunity: 6000,
    });


    await campaignRepository.update(businessId, campaign.id, {
      status: "READY",
    });

    const variants = await campaignRepository.addVariants(businessId, campaign.id, [
      {
        variantLabel: "Variant A",
        subject: "Hello",
        messageBody: "Body",
        callToAction: "CTA",
        tone: "friendly",
        isApproved: false,
      },
    ]);

    await campaignRepository.approveVariant(
      businessId,
      campaign.id,
      variants[0]!.id,
    );

    // Simulate 2 transient network failures (retry attempt 3 will succeed)
    MockEmailProvider.failNextSends(2);

    const summary = await emailQueueService.dispatchCampaign(
      userId,
      businessId,
      campaign.id,
    );

    expect(summary.sentCount).toBe(1);
    expect(summary.deliveredCount).toBe(1);

    const logs = await emailRepository.listByCampaign(businessId, campaign.id);
    expect(logs.length).toBe(1);
    expect(logs[0]?.retryCount).toBe(2);
    expect(logs[0]?.status).toBe("DELIVERED");
  });

  it("stops sending immediately if campaign is PAUSED mid-batch", async () => {
    // Seed 10 VIP customers
    for (let i = 1; i <= 10; i++) {
      await customerRepository.create(businessId, {
        name: `VIP ${i}`,
        email: `vip${i}@test.com`,
        totalPurchaseAmount: 6000 + i * 100,
        purchaseCount: 6,
        lastPurchaseDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        optOutStatus: false,
        consentStatus: true,
      });
    }


    const campaign = await campaignRepository.create(businessId, {
      name: "Large VIP Batch",
      targetSegment: "VIP",
      channel: "email",
      audienceCount: 10,
      estimatedOpportunity: 15000,
    });

    await campaignRepository.update(businessId, campaign.id, {
      status: "READY",
    });

    const variants = await campaignRepository.addVariants(businessId, campaign.id, [
      {
        variantLabel: "Variant A",
        subject: "Hello",
        messageBody: "Body",
        callToAction: "CTA",
        tone: "friendly",
        isApproved: false,
      },
    ]);

    await campaignRepository.approveVariant(
      businessId,
      campaign.id,
      variants[0]!.id,
    );

    // Pause the campaign before dispatching
    await campaignRepository.update(businessId, campaign.id, {
      status: "PAUSED",
    });

    // Attempt to dispatch on paused campaign should throw validation error
    await expect(
      emailQueueService.dispatchCampaign(userId, businessId, campaign.id),
    ).rejects.toThrow();
  });

  it("marks customers with invalid or malformed email format as FAILED without invoking email provider", async () => {
    await customerRepository.create(businessId, {
      name: "Malformed Email User",
      email: "invalid-email-address-no-at",
      totalPurchaseAmount: 6000,
      purchaseCount: 8,
      lastPurchaseDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      optOutStatus: false,
      consentStatus: true,
    });

    const campaign = await campaignRepository.create(businessId, {
      name: "VIP Validation Check",
      targetSegment: "VIP",
      channel: "email",
      audienceCount: 1,
      estimatedOpportunity: 6000,
    });

    await campaignRepository.update(businessId, campaign.id, {
      status: "READY",
    });

    const variants = await campaignRepository.addVariants(businessId, campaign.id, [
      {
        variantLabel: "Variant A",
        subject: "Hello",
        messageBody: "Body",
        callToAction: "CTA",
        tone: "friendly",
        isApproved: false,
      },
    ]);

    await campaignRepository.approveVariant(
      businessId,
      campaign.id,
      variants[0]!.id,
    );

    const summary = await emailQueueService.dispatchCampaign(
      userId,
      businessId,
      campaign.id,
    );

    expect(summary.totalTargeted).toBe(1);
    expect(summary.failedCount).toBe(1);
    expect(summary.sentCount).toBe(0);

    // Email provider should not have been called
    expect(MockEmailProvider.getSentEmails().length).toBe(0);

    const logs = await emailRepository.listByCampaign(businessId, campaign.id);
    expect(logs.length).toBe(1);
    expect(logs[0]?.status).toBe("FAILED");
    expect(logs[0]?.errorMessage).toContain("Invalid or missing recipient email");
  });
});

