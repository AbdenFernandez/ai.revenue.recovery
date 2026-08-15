import { describe, it, expect, beforeEach } from "vitest";
import { MockEmailProvider } from "@/lib/email/mock-provider";
import { EmailProviderFactory } from "@/lib/email/provider-factory";
import { emailRepository } from "@/repositories/email-repository";
import { MemberRepository } from "@/repositories/member-repository";
import { BusinessRepository } from "@/repositories/business-repository";
import { emailService } from "@/services/email-service";

describe("Email Idempotency & Duplicate Prevention", () => {
  const businessId = "biz-idem-test";
  const userId = "user-idem-owner";

  beforeEach(async () => {
    emailRepository.clearStore();
    MockEmailProvider.clearSentEmails();
    EmailProviderFactory.resetProvider();
    MemberRepository.clearMocks();
    BusinessRepository.clearMocks();

    BusinessRepository.setMock(businessId, {
      id: businessId,
      name: "Idempotent Corp",
      slug: "idempotent-corp",
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

  it("prevents duplicate dispatches when replaying identical idempotencyKey", async () => {
    const key = "cmp_send_camp1_cust1_var1";

    // First send: should invoke provider and create log
    const res1 = await emailService.sendSingleEmail(userId, businessId, {
      to: "client@example.com",
      subject: "Important Offer",
      html: "<p>Offer Details</p>",
      idempotencyKey: key,
    });

    expect(res1.success).toBe(true);
    expect(res1.status).toBe("SENT");
    expect(MockEmailProvider.getSentEmails().length).toBe(1);

    // Record status as SENT in repo for lookup
    await emailRepository.createLog({
      businessId,
      campaignId: "camp1",
      customerId: "cust1",
      variantId: "var1",
      recipientEmail: "client@example.com",
      idempotencyKey: key,
      status: "SENT",
      errorMessage: null,
      retryCount: 0,
      sentAt: new Date().toISOString(),
      deliveredAt: null,
      openedAt: null,
    });

    // Second send with same idempotencyKey: must return cached result without calling provider again
    const res2 = await emailService.sendSingleEmail(userId, businessId, {
      to: "client@example.com",
      subject: "Important Offer",
      html: "<p>Offer Details</p>",
      idempotencyKey: key,
    });

    expect(res2.success).toBe(true);
    expect(res2.messageId).toContain("idempotent_");
    // Provider calls count remains 1
    expect(MockEmailProvider.getSentEmails().length).toBe(1);
  });
});
