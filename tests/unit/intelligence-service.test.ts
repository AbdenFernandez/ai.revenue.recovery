import { beforeEach, describe, expect, it } from "vitest";
import { intelligenceService } from "@/services/intelligence-service";
import { customerRepository } from "@/repositories/customer-repository";
import { MemberRepository } from "@/repositories/member-repository";
import { BusinessRepository } from "@/repositories/business-repository";
import { PreferencesRepository } from "@/repositories/preferences-repository";
import { AppError } from "@/lib/errors";

describe("IntelligenceService & Opportunity Discovery", () => {
  const userOwnerA = "user-owner-a";
  const userOwnerB = "user-owner-b";

  const businessA = "biz-alpha";
  const businessB = "biz-beta";

  beforeEach(() => {
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
  });

  it("calculates comprehensive intelligence overview across tenant customer base", async () => {
    // 1. Active High Value Customer
    await customerRepository.create(businessA, {
      name: "Alice Active",
      email: "alice@active.com",
      totalPurchaseAmount: 1800,
      purchaseCount: 6,
      lastPurchaseDate: new Date("2026-08-01T00:00:00Z").toISOString(),
    });

    // 2. High-Value Inactive / Win-Back Customer (100 days ago)
    await customerRepository.create(businessA, {
      name: "Bob WinBack",
      email: "bob@winback.com",
      totalPurchaseAmount: 3200,
      purchaseCount: 5,
      lastPurchaseDate: new Date("2026-05-05T00:00:00Z").toISOString(),
    });

    // 3. Lost Customer (250 days ago)
    await customerRepository.create(businessA, {
      name: "Charlie Lost",
      email: "charlie@lost.com",
      totalPurchaseAmount: 200,
      purchaseCount: 1,
      lastPurchaseDate: new Date("2025-12-05T00:00:00Z").toISOString(),
    });

    const overview = await intelligenceService.getIntelligenceOverview(
      userOwnerA,
      businessA,
    );

    expect(overview.totalCustomers).toBe(3);
    expect(overview.activeCustomers).toBe(1);
    expect(overview.inactiveCustomers).toBe(2);
    expect(overview.highValueInactiveCustomers).toBe(1); // Bob
    expect(overview.totalEstimatedOpportunity).toBeGreaterThan(0);
    expect(overview.averageCustomerValue).toBeGreaterThan(0);

    expect(overview.segmentDistribution["Win Back"]).toBe(1);
    expect(overview.segmentDistribution["Lost"]).toBe(1);
  });

  it("retrieves and prioritizes actionable opportunities with filter support", async () => {
    await customerRepository.create(businessA, {
      name: "High Priority Client",
      email: "high@alpha.com",
      totalPurchaseAmount: 2500,
      purchaseCount: 4,
      lastPurchaseDate: new Date("2026-05-15T00:00:00Z").toISOString(),
    });

    await customerRepository.create(businessA, {
      name: "Low Value Client",
      email: "low@alpha.com",
      totalPurchaseAmount: 50,
      purchaseCount: 1,
      lastPurchaseDate: new Date("2026-05-15T00:00:00Z").toISOString(),
    });

    const result = await intelligenceService.getOpportunities(
      userOwnerA,
      businessA,
      {
        sortBy: "potentialRevenue",
        sortOrder: "desc",
      },
    );

    expect(result.total).toBe(2);
    expect(result.items[0]?.customerName).toBe("High Priority Client");
    expect(result.items[0]?.potentialRevenue).toBeGreaterThan(
      result.items[1]?.potentialRevenue ?? 0,
    );
    expect(result.totalEstimatedRevenue).toBeGreaterThan(0);
  });

  it("strictly enforces tenant isolation: User in Biz B cannot access Biz A intelligence", async () => {
    await customerRepository.create(businessA, {
      name: "Alpha Secret",
      email: "secret@alpha.com",
      totalPurchaseAmount: 5000,
      purchaseCount: 10,
    });

    // User Owner B attempting to get overview for Business A should throw FORBIDDEN
    await expect(
      intelligenceService.getIntelligenceOverview(userOwnerB, businessA),
    ).rejects.toThrowError(AppError);

    // User Owner B attempting to get opportunities for Business A should throw FORBIDDEN
    await expect(
      intelligenceService.getOpportunities(userOwnerB, businessA),
    ).rejects.toThrowError(AppError);
  });
});
