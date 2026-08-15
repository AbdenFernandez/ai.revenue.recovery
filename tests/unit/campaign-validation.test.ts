import { describe, expect, it } from "vitest";
import {
  approveCampaignRequestSchema,
  campaignListQuerySchema,
  createCampaignRequestSchema,
  estimateAudienceRequestSchema,
  updateCampaignRequestSchema,
} from "@/schemas/campaign";

describe("Campaign Zod Validation Schemas", () => {
  describe("createCampaignRequestSchema", () => {
    it("validates valid campaign creation payload", () => {
      const valid = createCampaignRequestSchema.parse({
        name: "VIP Appreciation Drive",
        description: "Focusing on top LTV accounts",
        targetSegment: "VIP",
        channel: "email",
        customGoal: "Boost Q3 repeat purchases",
        maxDiscountPercent: 20,
      });

      expect(valid.name).toBe("VIP Appreciation Drive");
      expect(valid.channel).toBe("email");
      expect(valid.maxDiscountPercent).toBe(20);
    });

    it("defaults channel to email and maxDiscountPercent to 15", () => {
      const minimal = createCampaignRequestSchema.parse({
        name: "Win Back Inactive",
        targetSegment: "Win Back",
      });

      expect(minimal.channel).toBe("email");
      expect(minimal.maxDiscountPercent).toBe(15);
    });

    it("rejects empty campaign name", () => {
      expect(() =>
        createCampaignRequestSchema.parse({
          name: "   ",
          targetSegment: "VIP",
        }),
      ).toThrow();
    });

    it("rejects discount > 100", () => {
      expect(() =>
        createCampaignRequestSchema.parse({
          name: "High Discount",
          targetSegment: "VIP",
          maxDiscountPercent: 120,
        }),
      ).toThrow();
    });
  });

  describe("updateCampaignRequestSchema", () => {
    it("validates update fields", () => {
      const valid = updateCampaignRequestSchema.parse({
        name: "Updated Campaign Title",
        description: "New description",
      });
      expect(valid.name).toBe("Updated Campaign Title");
    });
  });

  describe("approveCampaignRequestSchema", () => {
    it("requires approvedVariantId", () => {
      const valid = approveCampaignRequestSchema.parse({
        approvedVariantId: "var-123",
      });
      expect(valid.approvedVariantId).toBe("var-123");

      expect(() =>
        approveCampaignRequestSchema.parse({ approvedVariantId: "" }),
      ).toThrow();
    });
  });

  describe("estimateAudienceRequestSchema", () => {
    it("validates targetSegment enum", () => {
      const valid = estimateAudienceRequestSchema.parse({
        targetSegment: "Dormant",
      });
      expect(valid.targetSegment).toBe("Dormant");
    });
  });

  describe("campaignListQuerySchema", () => {
    it("parses query parameters and sets defaults", () => {
      const parsed = campaignListQuerySchema.parse({
        page: "2",
        limit: "15",
        status: "RUNNING",
      });

      expect(parsed.page).toBe(2);
      expect(parsed.limit).toBe(15);
      expect(parsed.status).toBe("RUNNING");
    });
  });
});
