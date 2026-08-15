import { describe, expect, it } from "vitest";
import {
  actionRecommendationSchema,
  analyzeCustomerRequestSchema,
  campaignIdeaSchema,
  customerRecommendationSchema,
  generateCampaignRequestSchema,
  generateMessageRequestSchema,
  messageGenerationSchema,
  segmentSummarySchema,
  summarizeSegmentRequestSchema,
} from "@/schemas/ai";

describe("AI Validation Schemas", () => {
  describe("Structured AI Output Schemas", () => {
    it("validates customerRecommendationSchema", () => {
      const valid = customerRecommendationSchema.parse({
        segment: "VIP",
        reason: "Customer has spent $4,800 across 8 orders.",
        recommended_action: "Send VIP loyalty appreciation gift.",
        message_angle: "VIP Appreciation & Concierge Access",
        confidence: 0.95,
      });
      expect(valid.segment).toBe("VIP");
      expect(valid.confidence).toBe(0.95);

      // Rejects out-of-range confidence
      expect(() =>
        customerRecommendationSchema.parse({
          segment: "VIP",
          reason: "Some reason",
          recommended_action: "Some action",
          message_angle: "Some angle",
          confidence: 1.5,
        }),
      ).toThrow();
    });

    it("validates campaignIdeaSchema", () => {
      const valid = campaignIdeaSchema.parse({
        campaignTitle: "Executive VIP Loyalty",
        targetSegment: "VIP",
        strategicAngle: "Appreciation and early access",
        keyThemes: ["Early access", "VIP support"],
        suggestedChannels: ["email", "sms"],
        rationale: "Maximizes LTV retention.",
      });
      expect(valid.keyThemes.length).toBe(2);

      // Rejects empty themes
      expect(() =>
        campaignIdeaSchema.parse({
          campaignTitle: "Campaign",
          targetSegment: "VIP",
          strategicAngle: "Angle",
          keyThemes: [],
          suggestedChannels: ["email"],
          rationale: "Rationale",
        }),
      ).toThrow();
    });

    it("validates messageGenerationSchema", () => {
      const valid = messageGenerationSchema.parse({
        subject: "Special update for Alex",
        messageBody: "Hi Alex, we miss you!",
        callToAction: "Explore Latest Additions",
        tone: "friendly",
        rationale: "Re-engages dormant account.",
      });
      expect(valid.subject).toBe("Special update for Alex");
    });

    it("validates segmentSummarySchema", () => {
      const valid = segmentSummarySchema.parse({
        segment: "At Risk",
        healthStatus: "Moderate Risk",
        keyOpportunity: "High win-back conversion potential.",
        recoveryStrategy: "Automated check-in.",
        estimatedImpact: "15% reorder rate.",
      });
      expect(valid.segment).toBe("At Risk");
    });

    it("validates actionRecommendationSchema", () => {
      const valid = actionRecommendationSchema.parse({
        actionType: "Win-Back Outreach",
        priority: "high",
        rationale: "Customer is 90 days inactive.",
        expectedOutcome: "Re-engage customer.",
      });
      expect(valid.priority).toBe("high");
    });
  });

  describe("API Request Input Schemas", () => {
    it("validates analyzeCustomerRequestSchema", () => {
      const valid = analyzeCustomerRequestSchema.parse({
        customerId: "cust-123",
      });
      expect(valid.customerId).toBe("cust-123");

      expect(() =>
        analyzeCustomerRequestSchema.parse({ customerId: "" }),
      ).toThrow();
    });

    it("validates generateCampaignRequestSchema", () => {
      const valid = generateCampaignRequestSchema.parse({
        segment: "Win Back",
        goal: "Reactivate accounts",
        maxDiscountPercent: 20,
      });
      expect(valid.segment).toBe("Win Back");
      expect(valid.maxDiscountPercent).toBe(20);

      // Rejects discount > 100
      expect(() =>
        generateCampaignRequestSchema.parse({
          segment: "Win Back",
          maxDiscountPercent: 150,
        }),
      ).toThrow();
    });

    it("validates generateMessageRequestSchema with channel defaults", () => {
      const valid = generateMessageRequestSchema.parse({
        customerId: "cust-abc",
      });
      expect(valid.channel).toBe("email");

      const customChannel = generateMessageRequestSchema.parse({
        customerId: "cust-abc",
        channel: "sms",
        customTone: "urgent",
        incentiveOffer: "20% off",
      });
      expect(customChannel.channel).toBe("sms");
      expect(customChannel.customTone).toBe("urgent");
    });

    it("validates summarizeSegmentRequestSchema", () => {
      const valid = summarizeSegmentRequestSchema.parse({
        segment: "High Value",
      });
      expect(valid.segment).toBe("High Value");
    });
  });
});
