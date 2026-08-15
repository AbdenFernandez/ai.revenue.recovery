import { assertTenantAccess } from "@/lib/auth/authorization";
import { AppError } from "@/lib/errors";
import { memberRepository } from "@/repositories/member-repository";
import { customerRepository } from "@/repositories/customer-repository";
import { preferencesRepository } from "@/repositories/preferences-repository";
import {
  analyzeCustomerOpportunity,
  DEFAULT_INTELLIGENCE_SETTINGS,
} from "@/lib/intelligence/scoring-engine";
import type {
  ChurnRiskTier,
  CustomerIntelligenceSettings,
  CustomerOpportunity,
  CustomerSegment,
  RevenueIntelligenceOverview,
} from "@/types/intelligence";
import type { OpportunitiesQueryInput } from "@/schemas/intelligence";
import type { PaginatedResult } from "@/types";

export class IntelligenceService {
  private async getSettings(
    businessId: string,
  ): Promise<CustomerIntelligenceSettings> {
    const prefs = await preferencesRepository.findByBusinessId(businessId);
    if (!prefs) return DEFAULT_INTELLIGENCE_SETTINGS;

    return {
      inactivityThresholdDays: prefs.inactivityThresholdDays || 60,
      atRiskThresholdDays: Math.round((prefs.inactivityThresholdDays || 60) * 1.5),
      dormantThresholdDays: Math.round((prefs.inactivityThresholdDays || 60) * 3),
      highValueSpendThreshold: 1000,
      vipSpendThreshold: 2500,
      targetPurchaseFrequency: 5,
    };
  }

  async getIntelligenceOverview(
    userId: string,
    businessId: string,
  ): Promise<RevenueIntelligenceOverview> {
    const userMemberships = await memberRepository.findByUserId(userId);
    assertTenantAccess(userMemberships, businessId);

    const settings = await this.getSettings(businessId);
    const result = await customerRepository.list(businessId, {}, 1, 10000);
    const customers = result.items;

    const segmentDistribution: Record<CustomerSegment, number> = {
      VIP: 0,
      "High Value": 0,
      Active: 0,
      "At Risk": 0,
      Dormant: 0,
      Lost: 0,
      "Win Back": 0,
      New: 0,
      "Potential High Value": 0,
    };

    const churnRiskDistribution: Record<ChurnRiskTier, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    let activeCount = 0;
    let inactiveCount = 0;
    let atRiskCount = 0;
    let highValueInactiveCount = 0;
    let totalEstimatedOpportunity = 0;
    let totalValueSum = 0;

    for (const customer of customers) {
      const opportunity = analyzeCustomerOpportunity(customer, settings);

      segmentDistribution[opportunity.segment]++;
      churnRiskDistribution[opportunity.churnRiskTier]++;
      totalValueSum += customer.totalPurchaseAmount;

      const isActiveSegment = [
        "VIP",
        "High Value",
        "Active",
        "New",
        "Potential High Value",
      ].includes(opportunity.segment);

      if (isActiveSegment) {
        activeCount++;
      } else {
        inactiveCount++;
        if (
          customer.totalPurchaseAmount >= settings.highValueSpendThreshold &&
          !customer.optOutStatus
        ) {
          highValueInactiveCount++;
        }
      }

      if (
        opportunity.churnRiskTier === "high" ||
        opportunity.churnRiskTier === "critical"
      ) {
        atRiskCount++;
      }

      if (!customer.optOutStatus && opportunity.potentialRevenue > 0) {
        totalEstimatedOpportunity += opportunity.potentialRevenue;
      }
    }

    const totalCustomers = customers.length;
    const averageCustomerValue =
      totalCustomers > 0 ? Math.round((totalValueSum / totalCustomers) * 100) / 100 : 0;

    return {
      totalCustomers,
      activeCustomers: activeCount,
      inactiveCustomers: inactiveCount,
      atRiskCustomers: atRiskCount,
      highValueInactiveCustomers: highValueInactiveCount,
      totalEstimatedOpportunity: Math.round(totalEstimatedOpportunity * 100) / 100,
      averageCustomerValue,
      segmentDistribution,
      churnRiskDistribution,
    };
  }

  async getOpportunities(
    userId: string,
    businessId: string,
    query: Partial<OpportunitiesQueryInput> = {},
  ): Promise<PaginatedResult<CustomerOpportunity> & { totalEstimatedRevenue: number }> {
    const userMemberships = await memberRepository.findByUserId(userId);
    assertTenantAccess(userMemberships, businessId);

    const settings = await this.getSettings(businessId);
    const result = await customerRepository.list(businessId, {}, 1, 10000);
    const customers = result.items;

    // Score all customers
    let opportunities: CustomerOpportunity[] = customers.map((c) =>
      analyzeCustomerOpportunity(c, settings),
    );

    // 1. Text Search
    if (query.search) {
      const q = query.search.toLowerCase().trim();
      opportunities = opportunities.filter(
        (o) =>
          o.customerName.toLowerCase().includes(q) ||
          o.customerEmail.toLowerCase().includes(q) ||
          (o.company && o.company.toLowerCase().includes(q)),
      );
    }

    // 2. Segment filter
    if (query.segment && query.segment !== "all") {
      opportunities = opportunities.filter((o) => o.segment === query.segment);
    }

    // 3. Risk Tier filter
    if (query.riskTier && query.riskTier !== "all") {
      opportunities = opportunities.filter(
        (o) => o.churnRiskTier === query.riskTier,
      );
    }

    // 4. Min Potential Revenue
    if (query.minPotentialRevenue !== undefined) {
      opportunities = opportunities.filter(
        (o) => o.potentialRevenue >= query.minPotentialRevenue!,
      );
    }

    // 5. Calculate Total Estimated Pipeline before pagination
    const totalEstimatedRevenue = Math.round(
      opportunities.reduce((acc, curr) => acc + curr.potentialRevenue, 0) * 100,
    ) / 100;

    // 6. Sorting
    const sortBy = query.sortBy || "potentialRevenue";
    const sortOrder = query.sortOrder || "desc";

    opportunities.sort((a, b) => {
      let valA: number;
      let valB: number;

      switch (sortBy) {
        case "winBackScore":
          valA = a.winBackScore;
          valB = b.winBackScore;
          break;
        case "churnRisk":
          valA = a.churnRisk;
          valB = b.churnRisk;
          break;
        case "totalPurchaseAmount":
          valA = a.totalPurchaseAmount;
          valB = b.totalPurchaseAmount;
          break;
        case "potentialRevenue":
        default:
          valA = a.potentialRevenue;
          valB = b.potentialRevenue;
          break;
      }

      return sortOrder === "asc" ? valA - valB : valB - valA;
    });

    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const total = opportunities.length;
    const startIndex = (page - 1) * pageSize;
    const items = opportunities.slice(startIndex, startIndex + pageSize);

    return {
      items,
      page,
      pageSize,
      total,
      totalEstimatedRevenue,
    };
  }

  async getCustomerScore(
    userId: string,
    businessId: string,
    customerId: string,
  ): Promise<CustomerOpportunity> {
    const userMemberships = await memberRepository.findByUserId(userId);
    assertTenantAccess(userMemberships, businessId);

    const customer = await customerRepository.findById(businessId, customerId);
    if (!customer) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Customer not found.",
      });
    }

    const settings = await this.getSettings(businessId);
    return analyzeCustomerOpportunity(customer, settings);
  }
}

export const intelligenceService = new IntelligenceService();
