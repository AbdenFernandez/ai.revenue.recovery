export type CustomerSegment =
  | "VIP"
  | "High Value"
  | "Active"
  | "At Risk"
  | "Dormant"
  | "Lost"
  | "Win Back"
  | "New"
  | "Potential High Value";

export type ChurnRiskTier = "low" | "medium" | "high" | "critical";

export interface CustomerRFMScore {
  recencyScore: number; // 0 - 100
  frequencyScore: number; // 0 - 100
  monetaryScore: number; // 0 - 100
  engagementScore: number; // 0 - 100
  customerValueScore: number; // 0 - 100
  daysSinceLastPurchase: number;
}

export interface CustomerOpportunity {
  customerId: string;
  customerName: string;
  customerEmail: string;
  company: string | null;
  phone: string | null;
  segment: CustomerSegment;
  churnRisk: number; // 0.00 - 1.00
  churnRiskTier: ChurnRiskTier;
  winBackScore: number; // 0.00 - 1.00
  purchaseProbability: number; // 0.00 - 1.00
  potentialRevenue: number; // Estimated dollar opportunity
  confidenceScore: number; // 0.00 - 1.00
  reason: string; // Plain-English explainable reason
  recommendedAction: string; // Playbook recommendation
  totalPurchaseAmount: number;
  purchaseCount: number;
  averageOrderValue: number;
  lastPurchaseDate: string | null;
  rfm: CustomerRFMScore;
}

export interface RevenueIntelligenceOverview {
  totalCustomers: number;
  activeCustomers: number;
  inactiveCustomers: number;
  atRiskCustomers: number;
  highValueInactiveCustomers: number;
  totalEstimatedOpportunity: number; // Estimated recoverable pipeline
  averageCustomerValue: number;
  segmentDistribution: Record<CustomerSegment, number>;
  churnRiskDistribution: Record<ChurnRiskTier, number>;
}

export interface CustomerIntelligenceSettings {
  inactivityThresholdDays: number;
  atRiskThresholdDays: number;
  dormantThresholdDays: number;
  highValueSpendThreshold: number;
  vipSpendThreshold: number;
  targetPurchaseFrequency: number;
}

export interface OpportunitiesFilter {
  segment?: CustomerSegment | "all";
  riskTier?: ChurnRiskTier | "all";
  minPotentialRevenue?: number;
  search?: string;
  sortBy?: "potentialRevenue" | "winBackScore" | "churnRisk" | "totalPurchaseAmount";
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}
