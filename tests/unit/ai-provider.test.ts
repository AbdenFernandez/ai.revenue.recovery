import { describe, expect, it } from "vitest";
import { MockAIProvider } from "@/lib/ai/mock-provider";
import {
  actionRecommendationSchema,
  campaignIdeaSchema,
  customerRecommendationSchema,
  messageGenerationSchema,
  segmentSummarySchema,
} from "@/schemas/ai";
import type {
  BusinessToneAndPolicyContext,
  MinimizedCustomerContext,
} from "@/types/ai";

describe("MockAIProvider (Local Development & Fallback Engine)", () => {
  const provider = new MockAIProvider();

  const mockCustomer: MinimizedCustomerContext = {
    customerName: "Alex Rivera",
    company: "Rivera Logistics",
    daysSinceLastPurchase: 110,
    purchaseCount: 4,
    totalPurchaseAmount: 2400,
    averageOrderValue: 600,
    serviceType: "Logistics Pro",
    segment: "Win Back",
  };

  const mockBusiness: BusinessToneAndPolicyContext = {
    businessName: "CargoPilot",
    aiTonePreference: "friendly",
    currency: "USD",
    maxAuthorizedDiscountPercent: 20,
    guaranteesOrPolicies: "Standard 30-day trial guarantee.",
  };

  it("analyzes customer and returns structured recommendation conforming to schema", async () => {
    const res = await provider.analyzeCustomer({
      customer: mockCustomer,
      business: mockBusiness,
    });

    const validated = customerRecommendationSchema.parse(res);
    expect(validated.segment).toBe("Win Back");
    expect(validated.reason).toContain("110 days");
    expect(validated.confidence).toBeGreaterThan(0.7);
    expect(validated.recommended_action).toBeDefined();
  });

  it("generates targeted campaign idea conforming to schema", async () => {
    const res = await provider.generateCampaign({
      segment: "VIP",
      business: mockBusiness,
      maxDiscountPercent: 20,
    });

    const validated = campaignIdeaSchema.parse(res);
    expect(validated.targetSegment).toBe("VIP");
    expect(validated.keyThemes.length).toBeGreaterThan(0);
    expect(validated.suggestedChannels).toContain("email");
    expect(validated.rationale).toBeDefined();
  });

  it("generates personalized multi-channel outreach messages conforming to schema", async () => {
    // 1. Email Channel
    const emailRes = await provider.generateMessage({
      customer: mockCustomer,
      business: mockBusiness,
      channel: "email",
      incentiveOffer: "15% discount",
    });

    const validEmail = messageGenerationSchema.parse(emailRes);
    expect(validEmail.subject).toContain("CargoPilot");
    expect(validEmail.messageBody).toContain("Alex");
    expect(validEmail.messageBody).toContain("15% discount");
    expect(validEmail.callToAction).toBeDefined();

    // 2. SMS Channel
    const smsRes = await provider.generateMessage({
      customer: mockCustomer,
      business: mockBusiness,
      channel: "sms",
    });

    const validSms = messageGenerationSchema.parse(smsRes);
    expect(validSms.messageBody).toContain("CargoPilot");
  });

  it("summarizes segment with strategic opportunities conforming to schema", async () => {
    const res = await provider.summarizeSegment({
      segment: "At Risk",
      business: mockBusiness,
    });

    const validated = segmentSummarySchema.parse(res);
    expect(validated.segment).toBe("At Risk");
    expect(validated.recoveryStrategy).toBeDefined();
    expect(validated.estimatedImpact).toBeDefined();
  });

  it("recommends tactical action conforming to schema", async () => {
    const res = await provider.recommendAction({
      customer: mockCustomer,
      business: mockBusiness,
    });

    const validated = actionRecommendationSchema.parse(res);
    expect(validated.actionType).toBe("Win-Back Outreach");
    expect(validated.priority).toBe("high");
  });
});
