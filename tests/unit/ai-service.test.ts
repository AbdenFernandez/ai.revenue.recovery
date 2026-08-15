import { beforeEach, describe, expect, it } from "vitest";
import { aiService } from "@/services/ai-service";
import { customerRepository } from "@/repositories/customer-repository";
import { MemberRepository } from "@/repositories/member-repository";
import { BusinessRepository } from "@/repositories/business-repository";
import { PreferencesRepository } from "@/repositories/preferences-repository";
import { AppError } from "@/lib/errors";

describe("AIService Domain Orchestrator", () => {
  const userOwnerA = "user-owner-a";
  const userOwnerB = "user-owner-b";

  const businessA = "biz-alpha";
  const businessB = "biz-beta";

  let customerIdA: string;

  beforeEach(async () => {
    customerRepository.clearMocks();
    MemberRepository.clearMocks();
    BusinessRepository.clearMocks();
    PreferencesRepository.clearMocks();

    // Setup Business A
    BusinessRepository.setMock(businessA, {
      id: businessA,
      name: "Alpha Corp",
      slug: "alpha",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    MemberRepository.setMock("m-1", {
      id: "m-1",
      businessId: businessA,
      userId: userOwnerA,
      role: "OWNER",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    PreferencesRepository.setMock(businessA, {
      id: "pref-a",
      businessId: businessA,
      inactivityThresholdDays: 60,
      recoveryRateTarget: 0.2,
      aiTonePreference: "professional",
      currency: "USD",
      timezone: "UTC",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Setup Business B
    BusinessRepository.setMock(businessB, {
      id: businessB,
      name: "Beta Corp",
      slug: "beta",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    MemberRepository.setMock("m-2", {
      id: "m-2",
      businessId: businessB,
      userId: userOwnerB,
      role: "OWNER",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Seed customer in Business A
    const custA = await customerRepository.create(businessA, {
      name: "David Miller",
      email: "david@miller-enterprises.com",
      company: "Miller Enterprises",
      totalPurchaseAmount: 4200,
      purchaseCount: 7,
      lastPurchaseDate: new Date("2026-04-15T00:00:00Z").toISOString(),
    });
    customerIdA = custA.id;
  });

  it("analyzes customer and returns structured AI recommendation with explainability reason", async () => {
    const recommendation = await aiService.analyzeCustomer(
      userOwnerA,
      businessA,
      customerIdA,
    );

    expect(recommendation.segment).toBeDefined();
    expect(recommendation.reason).toBeDefined();
    expect(recommendation.recommended_action).toBeDefined();
    expect(recommendation.message_angle).toBeDefined();
    expect(recommendation.confidence).toBeGreaterThan(0);
  });

  it("generates segment campaign strategy respecting tone preference", async () => {
    const campaign = await aiService.generateCampaign(
      userOwnerA,
      businessA,
      "Win Back",
      "Re-engage churned enterprise accounts",
      20,
    );

    expect(campaign.campaignTitle).toBeDefined();
    expect(campaign.targetSegment).toBe("Win Back");
    expect(campaign.keyThemes.length).toBeGreaterThan(0);
    expect(campaign.suggestedChannels).toContain("email");
  });

  it("generates personalized outreach message for specific customer", async () => {
    const message = await aiService.generateMessage(
      userOwnerA,
      businessA,
      customerIdA,
      "email",
      "professional",
      "15% loyalty rebate",
    );

    expect(message.subject).toContain("Alpha Corp");
    expect(message.messageBody).toContain("David");
    expect(message.messageBody).toContain("15% loyalty rebate");
    expect(message.tone).toBe("professional");
  });

  it("summarizes customer segment health status", async () => {
    const summary = await aiService.summarizeSegment(
      userOwnerA,
      businessA,
      "VIP",
    );

    expect(summary.segment).toBe("VIP");
    expect(summary.healthStatus).toBeDefined();
    expect(summary.recoveryStrategy).toBeDefined();
  });

  it("strictly prevents unauthorized tenant from triggering AI on another tenant's customer", async () => {
    // User B attempting to analyze customer in Business A must throw FORBIDDEN (403)
    await expect(
      aiService.analyzeCustomer(userOwnerB, businessA, customerIdA),
    ).rejects.toThrowError(AppError);

    // User B attempting to generate message for customer in Business A must throw FORBIDDEN (403)
    await expect(
      aiService.generateMessage(
        userOwnerB,
        businessA,
        customerIdA,
        "email",
      ),
    ).rejects.toThrowError(AppError);
  });
});
