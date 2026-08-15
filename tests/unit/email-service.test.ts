import { describe, it, expect, beforeEach } from "vitest";
import { AppError } from "@/lib/errors";
import { MemberRepository } from "@/repositories/member-repository";
import { BusinessRepository } from "@/repositories/business-repository";
import { emailRepository } from "@/repositories/email-repository";
import { suppressionRepository } from "@/repositories/suppression-repository";
import { emailService } from "@/services/email-service";

describe("Email Service Tenant Isolation & Webhooks", () => {
  const businessA = "biz-svc-alpha";
  const businessB = "biz-svc-beta";
  const userA = "user-svc-alpha";
  const userB = "user-svc-beta";

  beforeEach(async () => {
    emailRepository.clearStore();
    suppressionRepository.clearStore();
    MemberRepository.clearMocks();
    BusinessRepository.clearMocks();

    BusinessRepository.setMock(businessA, {
      id: businessA,
      name: "Alpha Corp",
      slug: "alpha-corp",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    BusinessRepository.setMock(businessB, {
      id: businessB,
      name: "Beta Corp",
      slug: "beta-corp",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    MemberRepository.setMock("mem-a", {
      id: "mem-a",
      businessId: businessA,
      userId: userA,
      role: "OWNER",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    MemberRepository.setMock("mem-b", {
      id: "mem-b",
      businessId: businessB,
      userId: userB,
      role: "OWNER",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  it("blocks user B from sending emails or viewing logs in Business A", async () => {
    // User B sending in Business A -> FORBIDDEN
    await expect(
      emailService.sendSingleEmail(userB, businessA, {
        to: "recipient@test.com",
        subject: "Forbidden Send",
        html: "<p>test</p>",
        idempotencyKey: "test-idem-1",
      }),
    ).rejects.toThrowError(AppError);

    // User B viewing campaign logs in Business A -> FORBIDDEN
    await expect(
      emailService.getCampaignEmailLogs(userB, businessA, "camp-alpha"),
    ).rejects.toThrowError(AppError);
  });

  it("handles webhook delivery and open events updating dispatch logs", async () => {
    const key = "webhook-key-100";

    const log = await emailRepository.createLog({
      businessId: businessA,
      campaignId: "camp-1",
      customerId: "cust-1",
      variantId: "var-1",
      recipientEmail: "webhook@test.com",
      idempotencyKey: key,
      status: "SENT",
      errorMessage: null,
      retryCount: 0,
      sentAt: new Date().toISOString(),
      deliveredAt: null,
      openedAt: null,
    });

    // 1. Process delivery webhook
    await emailService.handleWebhookEvent({
      event: "delivered",
      idempotencyKey: key,
      email: "webhook@test.com",
    });

    const updatedLog1 = await emailRepository.findById(log.id);
    expect(updatedLog1?.status).toBe("DELIVERED");
    expect(updatedLog1?.deliveredAt).not.toBeNull();

    // 2. Process open webhook
    await emailService.handleWebhookEvent({
      event: "opened",
      idempotencyKey: key,
      email: "webhook@test.com",
    });

    const updatedLog2 = await emailRepository.findById(log.id);
    expect(updatedLog2?.status).toBe("OPENED");
    expect(updatedLog2?.openedAt).not.toBeNull();
  });
});
