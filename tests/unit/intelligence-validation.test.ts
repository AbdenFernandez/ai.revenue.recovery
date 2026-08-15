import { describe, expect, it } from "vitest";
import {
  intelligenceSettingsSchema,
  opportunitiesQuerySchema,
} from "@/schemas/intelligence";

describe("Intelligence Validation Schemas", () => {
  describe("opportunitiesQuerySchema", () => {
    it("parses valid query parameters with defaults", () => {
      const parsed = opportunitiesQuerySchema.parse({});
      expect(parsed.page).toBe(1);
      expect(parsed.pageSize).toBe(20);
      expect(parsed.sortBy).toBe("potentialRevenue");
      expect(parsed.sortOrder).toBe("desc");
    });

    it("preprocesses empty string query parameters into undefined", () => {
      const parsed = opportunitiesQuerySchema.parse({
        segment: "",
        riskTier: "",
        minPotentialRevenue: "",
        search: "   ",
        sortBy: "",
        sortOrder: "",
        page: "",
        pageSize: "",
      });

      expect(parsed.segment).toBeUndefined();
      expect(parsed.riskTier).toBeUndefined();
      expect(parsed.minPotentialRevenue).toBeUndefined();
      expect(parsed.search).toBeUndefined();
      expect(parsed.sortBy).toBe("potentialRevenue");
      expect(parsed.page).toBe(1);
      expect(parsed.pageSize).toBe(20);
    });

    it("parses explicit segment and risk tier filters", () => {
      const parsed = opportunitiesQuerySchema.parse({
        segment: "VIP",
        riskTier: "critical",
        minPotentialRevenue: "500",
        sortBy: "winBackScore",
        sortOrder: "asc",
        page: "2",
        pageSize: "50",
      });

      expect(parsed.segment).toBe("VIP");
      expect(parsed.riskTier).toBe("critical");
      expect(parsed.minPotentialRevenue).toBe(500);
      expect(parsed.sortBy).toBe("winBackScore");
      expect(parsed.sortOrder).toBe("asc");
      expect(parsed.page).toBe(2);
      expect(parsed.pageSize).toBe(50);
    });

    it("rejects invalid segment values", () => {
      expect(() =>
        opportunitiesQuerySchema.parse({
          segment: "INVALID_SEGMENT",
        }),
      ).toThrow();
    });

    it("rejects invalid risk tiers", () => {
      expect(() =>
        opportunitiesQuerySchema.parse({
          riskTier: "extreme",
        }),
      ).toThrow();
    });
  });

  describe("intelligenceSettingsSchema", () => {
    it("validates and defaults intelligence settings", () => {
      const settings = intelligenceSettingsSchema.parse({});
      expect(settings.inactivityThresholdDays).toBe(60);
      expect(settings.atRiskThresholdDays).toBe(90);
      expect(settings.dormantThresholdDays).toBe(180);
      expect(settings.highValueSpendThreshold).toBe(1000);
      expect(settings.vipSpendThreshold).toBe(2500);
      expect(settings.targetPurchaseFrequency).toBe(5);
    });

    it("validates custom numeric thresholds", () => {
      const custom = intelligenceSettingsSchema.parse({
        inactivityThresholdDays: "45",
        atRiskThresholdDays: "75",
        dormantThresholdDays: "120",
        highValueSpendThreshold: "2000",
        vipSpendThreshold: "5000",
        targetPurchaseFrequency: "8",
      });

      expect(custom.inactivityThresholdDays).toBe(45);
      expect(custom.highValueSpendThreshold).toBe(2000);
      expect(custom.vipSpendThreshold).toBe(5000);
    });
  });
});
