import { describe, expect, it } from "vitest";
import {
  calculateChurnRisk,
  calculateConfidenceScore,
  calculateCustomerValueScore,
  calculateEngagementScore,
  calculateFrequencyScore,
  calculateMonetaryScore,
  calculatePotentialRevenue,
  calculatePurchaseProbability,
  calculateRecencyScore,
  calculateWinBackScore,
  generateExplainableReason,
  generateRecommendedAction,
  getDaysSinceLastPurchase,
  analyzeCustomerOpportunity,
  DEFAULT_INTELLIGENCE_SETTINGS,
} from "@/lib/intelligence/scoring-engine";
import type { Customer } from "@/types/customer";

describe("Revenue Intelligence Scoring Engine (Deterministic Math)", () => {
  describe("Recency Scoring & Days Calculation", () => {
    it("handles standard past dates", () => {
      const now = new Date("2026-08-15T00:00:00Z");
      const past30d = new Date("2026-07-16T00:00:00Z").toISOString();

      const days = getDaysSinceLastPurchase(past30d, now);
      expect(days).toBe(30);

      const rScore = calculateRecencyScore(days, 60);
      expect(rScore).toBeGreaterThan(60);
      expect(rScore).toBeLessThanOrEqual(100);
    });

    it("handles edge case: missing, null, or invalid dates", () => {
      expect(getDaysSinceLastPurchase(null)).toBe(365);
      expect(getDaysSinceLastPurchase(undefined)).toBe(365);
      expect(getDaysSinceLastPurchase("invalid-date-string")).toBe(365);

      const score = calculateRecencyScore(365, 60);
      expect(score).toBe(5);
    });

    it("handles edge case: future dates without crashing", () => {
      const now = new Date("2026-08-15T00:00:00Z");
      const futureDate = new Date("2026-09-01T00:00:00Z").toISOString();

      const days = getDaysSinceLastPurchase(futureDate, now);
      expect(days).toBe(0);
      expect(calculateRecencyScore(days)).toBe(100);
    });

    it("handles edge case: extremely old customer dates (> 5 years)", () => {
      const days = 2000;
      const score = calculateRecencyScore(days);
      expect(score).toBe(5);
    });
  });

  describe("Frequency & Monetary Scoring", () => {
    it("calculates frequency score proportionately", () => {
      expect(calculateFrequencyScore(0)).toBe(0);
      expect(calculateFrequencyScore(1, 5)).toBe(20);
      expect(calculateFrequencyScore(5, 5)).toBe(100);
      expect(calculateFrequencyScore(15, 5)).toBe(100); // Clamped to 100
    });

    it("calculates monetary score proportionately", () => {
      expect(calculateMonetaryScore(0)).toBe(0);
      expect(calculateMonetaryScore(750, 1000)).toBe(50);
      expect(calculateMonetaryScore(1500, 1000)).toBe(100);
      expect(calculateMonetaryScore(5000, 1000)).toBe(100); // Clamped to 100
    });

    it("handles negative / invalid input safely", () => {
      expect(calculateFrequencyScore(-5)).toBe(0);
      expect(calculateMonetaryScore(-500)).toBe(0);
    });
  });

  describe("Engagement & Value Score", () => {
    it("assigns 0 engagement to opted-out customers", () => {
      expect(calculateEngagementScore(true, true)).toBe(0);
      expect(calculateEngagementScore(false, true)).toBe(0);
    });

    it("rewards consented customers with recent contact bonus", () => {
      const now = new Date().toISOString();
      const scoreRecent = calculateEngagementScore(true, false, now);
      const scoreNoContact = calculateEngagementScore(true, false, null);

      expect(scoreRecent).toBe(95);
      expect(scoreNoContact).toBe(70);
    });

    it("computes weighted composite customer value score", () => {
      const val = calculateCustomerValueScore(100, 100, 100);
      expect(val).toBe(100);

      const mixed = calculateCustomerValueScore(80, 50, 60);
      // 0.35*80 + 0.35*50 + 0.30*60 = 28 + 17.5 + 18 = 63.5 -> 64
      expect(mixed).toBe(64);
    });
  });

  describe("Churn Risk & Win-Back Opportunity Model", () => {
    it("sets churn risk to 1.0 (critical) for opted-out customers", () => {
      const { churnRisk, tier } = calculateChurnRisk(10, 5, true);
      expect(churnRisk).toBe(1.0);
      expect(tier).toBe("critical");
    });

    it("assigns low risk to recent frequent buyers", () => {
      const { churnRisk, tier } = calculateChurnRisk(15, 4, false, 60, 90, 180);
      expect(churnRisk).toBeLessThan(0.35);
      expect(tier).toBe("low");
    });

    it("assigns high and critical risk as days exceed thresholds", () => {
      const highRisk = calculateChurnRisk(100, 3, false, 60, 90, 180);
      expect(highRisk.churnRisk).toBeGreaterThanOrEqual(0.6);
      expect(highRisk.tier).toBe("high");

      const criticalRisk = calculateChurnRisk(200, 3, false, 60, 90, 180);
      expect(criticalRisk.churnRisk).toBeGreaterThanOrEqual(0.8);
      expect(criticalRisk.tier).toBe("critical");
    });

    it("computes win-back score and potential revenue opportunity", () => {
      const winBack = calculateWinBackScore(80, 70, 60, false);
      expect(winBack).toBeGreaterThan(0.5);

      const purchaseProb = calculatePurchaseProbability(0.4, winBack);
      expect(purchaseProb).toBeGreaterThan(0.4);

      const potential = calculatePotentialRevenue(300, purchaseProb, winBack);
      expect(potential).toBeGreaterThan(0);
      expect(potential).toBeLessThanOrEqual(300);
    });

    it("returns zero win-back and potential revenue for opted-out customers", () => {
      const winBack = calculateWinBackScore(100, 100, 10, true);
      expect(winBack).toBe(0.0);

      const potential = calculatePotentialRevenue(500, 0.5, 0.0);
      expect(potential).toBe(0);
    });

    it("calculates confidence score bounded between 0.2 and 1.0", () => {
      const highConf = calculateConfidenceScore(0.9, 80, 80);
      expect(highConf).toBeGreaterThan(0.7);
      expect(highConf).toBeLessThanOrEqual(1.0);

      const minConf = calculateConfidenceScore(0.0, 0, 0);
      expect(minConf).toBe(0.2);
    });
  });


  describe("Explainable Narrative & Recommended Action", () => {
    const dummyCustomer: Customer = {
      id: "cust-1",
      businessId: "biz-1",
      name: "Alice Johnson",
      email: "alice@example.com",
      phone: null,
      company: "Acme Corp",
      lastPurchaseDate: new Date("2026-05-15T00:00:00Z").toISOString(),
      totalPurchaseAmount: 4800,
      purchaseCount: 6,
      averageOrderValue: 800,
      lastContactDate: null,
      serviceType: "Enterprise",
      customerStatus: "active",
      consentStatus: true,
      optOutStatus: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    it("generates transparent explainable reason narrative", () => {
      const reason = generateExplainableReason(dummyCustomer, 92);
      expect(reason).toContain("Customer has not purchased for 92 days");
      expect(reason).toContain("previously completed 6 orders");
      expect(reason).toContain("has spent a total of $4,800");
    });

    it("generates appropriate strategy based on risk and segment", () => {
      const actionVip = generateRecommendedAction("VIP", "low", 0.8);
      expect(actionVip).toContain("VIP executive check-in");

      const actionCritical = generateRecommendedAction("Lost", "critical", 0.2);
      expect(actionCritical).toContain("high-urgency win-back sequence");
    });

    it("produces full customer opportunity profile", () => {
      const opportunity = analyzeCustomerOpportunity(
        dummyCustomer,
        DEFAULT_INTELLIGENCE_SETTINGS,
      );

      expect(opportunity.customerName).toBe("Alice Johnson");
      expect(opportunity.potentialRevenue).toBeGreaterThan(0);
      expect(opportunity.confidenceScore).toBeGreaterThan(0);
      expect(opportunity.rfm.recencyScore).toBeDefined();
      expect(opportunity.rfm.frequencyScore).toBeDefined();
      expect(opportunity.rfm.monetaryScore).toBeDefined();
    });
  });
});
