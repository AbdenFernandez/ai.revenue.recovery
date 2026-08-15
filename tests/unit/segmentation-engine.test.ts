import { describe, expect, it } from "vitest";
import { classifyCustomerSegment } from "@/lib/intelligence/segmentation-engine";
import { DEFAULT_INTELLIGENCE_SETTINGS } from "@/lib/intelligence/scoring-engine";
import type { Customer } from "@/types/customer";
import type { CustomerRFMScore } from "@/types/intelligence";

describe("Customer Segmentation Engine (9 Distinct Segments)", () => {
  const baseCustomer: Customer = {
    id: "cust-test",
    businessId: "biz-test",
    name: "Test Customer",
    email: "test@example.com",
    phone: null,
    company: null,
    lastPurchaseDate: new Date().toISOString(),
    totalPurchaseAmount: 100,
    purchaseCount: 1,
    averageOrderValue: 100,
    lastContactDate: null,
    serviceType: null,
    customerStatus: "active",
    consentStatus: true,
    optOutStatus: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const createRFM = (days: number): CustomerRFMScore => ({
    recencyScore: 80,
    frequencyScore: 80,
    monetaryScore: 80,
    engagementScore: 80,
    customerValueScore: 80,
    daysSinceLastPurchase: days,
  });

  it("classifies as VIP when monetary spend and frequency are top-tier and recent", () => {
    const vipCustomer: Customer = {
      ...baseCustomer,
      totalPurchaseAmount: 3500, // > vipSpendThreshold (2500)
      purchaseCount: 8, // > targetFrequency (5)
    };
    const segment = classifyCustomerSegment(
      vipCustomer,
      createRFM(20),
      DEFAULT_INTELLIGENCE_SETTINGS,
    );
    expect(segment).toBe("VIP");
  });

  it("classifies as Win Back when high spend customer becomes inactive beyond at-risk threshold", () => {
    const winBackCustomer: Customer = {
      ...baseCustomer,
      totalPurchaseAmount: 1800, // > highValueSpendThreshold (1000)
      purchaseCount: 4,
    };
    const segment = classifyCustomerSegment(
      winBackCustomer,
      createRFM(110), // > atRiskThresholdDays (90)
      DEFAULT_INTELLIGENCE_SETTINGS,
    );
    expect(segment).toBe("Win Back");
  });

  it("classifies as High Value when spend is high and active", () => {
    const highValueCustomer: Customer = {
      ...baseCustomer,
      totalPurchaseAmount: 1200,
      purchaseCount: 3,
    };
    const segment = classifyCustomerSegment(
      highValueCustomer,
      createRFM(35),
      DEFAULT_INTELLIGENCE_SETTINGS,
    );
    expect(segment).toBe("High Value");
  });

  it("classifies as Potential High Value when AOV is high with early order count", () => {
    const potHighValue: Customer = {
      ...baseCustomer,
      totalPurchaseAmount: 900,
      purchaseCount: 2,
      averageOrderValue: 450, // >= 1000 * 0.4 = 400
    };
    const segment = classifyCustomerSegment(
      potHighValue,
      createRFM(15),
      DEFAULT_INTELLIGENCE_SETTINGS,
    );
    expect(segment).toBe("Potential High Value");
  });

  it("classifies as New when customer has 1 recent purchase", () => {
    const newCustomer: Customer = {
      ...baseCustomer,
      totalPurchaseAmount: 80,
      purchaseCount: 1,
      averageOrderValue: 80,
    };
    const segment = classifyCustomerSegment(
      newCustomer,
      createRFM(10),
      DEFAULT_INTELLIGENCE_SETTINGS,
    );
    expect(segment).toBe("New");
  });

  it("classifies as Active when customer has >= 2 orders and recent purchase", () => {
    const activeCustomer: Customer = {
      ...baseCustomer,
      totalPurchaseAmount: 300,
      purchaseCount: 3,
      averageOrderValue: 100,
    };
    const segment = classifyCustomerSegment(
      activeCustomer,
      createRFM(25),
      DEFAULT_INTELLIGENCE_SETTINGS,
    );
    expect(segment).toBe("Active");
  });

  it("classifies as At Risk when previously active customer exceeds inactivity threshold", () => {
    const atRiskCustomer: Customer = {
      ...baseCustomer,
      totalPurchaseAmount: 300,
      purchaseCount: 3,
      averageOrderValue: 100,
    };
    const segment = classifyCustomerSegment(
      atRiskCustomer,
      createRFM(75), // > 60d and <= 90d
      DEFAULT_INTELLIGENCE_SETTINGS,
    );
    expect(segment).toBe("At Risk");
  });

  it("classifies as Dormant when customer is inactive between 90 and 180 days", () => {
    const dormantCustomer: Customer = {
      ...baseCustomer,
      totalPurchaseAmount: 200,
      purchaseCount: 2,
      averageOrderValue: 100,
    };
    const segment = classifyCustomerSegment(
      dormantCustomer,
      createRFM(130), // > 90d and <= 180d
      DEFAULT_INTELLIGENCE_SETTINGS,
    );
    expect(segment).toBe("Dormant");
  });

  it("classifies as Lost when customer is inactive beyond 180 days", () => {
    const lostCustomer: Customer = {
      ...baseCustomer,
      totalPurchaseAmount: 150,
      purchaseCount: 1,
      averageOrderValue: 150,
    };
    const segment = classifyCustomerSegment(
      lostCustomer,
      createRFM(220), // > 180d
      DEFAULT_INTELLIGENCE_SETTINGS,
    );
    expect(segment).toBe("Lost");
  });
});
