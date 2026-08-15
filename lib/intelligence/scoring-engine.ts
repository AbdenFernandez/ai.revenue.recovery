import type { Customer } from "@/types/customer";
import type {
  ChurnRiskTier,
  CustomerIntelligenceSettings,
  CustomerOpportunity,
  CustomerRFMScore,
} from "@/types/intelligence";
import { classifyCustomerSegment } from "./segmentation-engine";

export const DEFAULT_INTELLIGENCE_SETTINGS: CustomerIntelligenceSettings = {
  inactivityThresholdDays: 60,
  atRiskThresholdDays: 90,
  dormantThresholdDays: 180,
  highValueSpendThreshold: 1000,
  vipSpendThreshold: 2500,
  targetPurchaseFrequency: 5,
};

export function getDaysSinceLastPurchase(
  lastPurchaseDate: string | null | undefined,
  now: Date = new Date(),
): number {
  if (!lastPurchaseDate) return 365;

  const parsed = new Date(lastPurchaseDate);
  if (isNaN(parsed.getTime())) return 365;

  const diffMs = now.getTime() - parsed.getTime();
  if (diffMs < 0) return 0; // Future dates clamped to 0

  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export function calculateRecencyScore(
  daysSinceLastPurchase: number,
  inactivityThresholdDays = 60,
): number {
  if (daysSinceLastPurchase <= 0) return 100;
  if (daysSinceLastPurchase >= 365) return 5;

  const normalized = Math.max(
    0,
    Math.min(
      100,
      Math.round(100 * Math.exp(-daysSinceLastPurchase / (inactivityThresholdDays * 1.5))),
    ),
  );

  return Math.max(5, normalized);
}

export function calculateFrequencyScore(
  purchaseCount: number,
  targetFrequency = 5,
): number {
  const safeCount = Math.max(0, purchaseCount || 0);
  if (safeCount === 0) return 0;

  const score = Math.round((safeCount / targetFrequency) * 100);
  return Math.min(100, Math.max(10, score));
}

export function calculateMonetaryScore(
  totalPurchaseAmount: number,
  highValueSpendThreshold = 1000,
): number {
  const safeAmount = Math.max(0, totalPurchaseAmount || 0);
  if (safeAmount === 0) return 0;

  const benchmark = highValueSpendThreshold * 1.5;
  const score = Math.round((Math.min(safeAmount, benchmark) / benchmark) * 100);
  return Math.min(100, Math.max(5, score));
}

export function calculateEngagementScore(
  consentStatus: boolean,
  optOutStatus: boolean,
  lastContactDate?: string | null,
): number {
  if (optOutStatus) return 0;
  if (!consentStatus) return 20;

  let base = 70;
  if (lastContactDate) {
    const daysSinceContact = getDaysSinceLastPurchase(lastContactDate);
    if (daysSinceContact <= 30) base = 95;
    else if (daysSinceContact <= 60) base = 85;
    else if (daysSinceContact <= 90) base = 75;
  }

  return base;
}

export function calculateCustomerValueScore(
  rScore: number,
  fScore: number,
  mScore: number,
): number {
  return Math.round(0.35 * rScore + 0.35 * fScore + 0.3 * mScore);
}

export function calculateChurnRisk(
  daysSinceLastPurchase: number,
  purchaseCount: number,
  optOutStatus: boolean,
  inactivityThresholdDays = 60,
  atRiskThresholdDays = 90,
  dormantThresholdDays = 180,
): { churnRisk: number; tier: ChurnRiskTier } {
  if (optOutStatus) {
    return { churnRisk: 1.0, tier: "critical" };
  }

  if (purchaseCount === 0) {
    return { churnRisk: 0.5, tier: "medium" };
  }

  let risk = 0.1;

  if (daysSinceLastPurchase <= inactivityThresholdDays / 2) {
    risk = 0.05 + (daysSinceLastPurchase / inactivityThresholdDays) * 0.15;
  } else if (daysSinceLastPurchase <= inactivityThresholdDays) {
    risk = 0.2 + ((daysSinceLastPurchase - inactivityThresholdDays / 2) / inactivityThresholdDays) * 0.25;
  } else if (daysSinceLastPurchase <= atRiskThresholdDays) {
    risk = 0.45 + ((daysSinceLastPurchase - inactivityThresholdDays) / (atRiskThresholdDays - inactivityThresholdDays)) * 0.25;
  } else if (daysSinceLastPurchase <= dormantThresholdDays) {
    risk = 0.7 + ((daysSinceLastPurchase - atRiskThresholdDays) / (dormantThresholdDays - atRiskThresholdDays)) * 0.18;
  } else {
    risk = 0.88 + Math.min(0.1, ((daysSinceLastPurchase - dormantThresholdDays) / 365) * 0.1);
  }

  const churnRisk = Math.round(Math.min(0.98, Math.max(0.02, risk)) * 100) / 100;

  let tier: ChurnRiskTier = "low";
  if (churnRisk >= 0.8) tier = "critical";
  else if (churnRisk >= 0.6) tier = "high";
  else if (churnRisk >= 0.35) tier = "medium";

  return { churnRisk, tier };
}

export function calculateWinBackScore(
  monetaryScore: number,
  frequencyScore: number,
  daysSinceLastPurchase: number,
  optOutStatus: boolean,
): number {
  if (optOutStatus) return 0.0;

  const recencyPenalty = Math.min(1.0, daysSinceLastPurchase / 365);
  const score =
    (monetaryScore / 100) * 0.5 +
    (frequencyScore / 100) * 0.35 +
    (1 - recencyPenalty) * 0.15;

  return Math.round(Math.min(1.0, Math.max(0.0, score)) * 100) / 100;
}

export function calculatePurchaseProbability(
  churnRisk: number,
  winBackScore: number,
): number {
  if (winBackScore === 0) return 0.0;
  const prob = (1 - churnRisk * 0.7) * 0.4 + winBackScore * 0.6;
  return Math.round(Math.min(0.95, Math.max(0.02, prob)) * 100) / 100;
}

export function calculatePotentialRevenue(
  averageOrderValue: number,
  purchaseProbability: number,
  winBackScore: number,
): number {
  const safeAov = Math.max(0, averageOrderValue || 0);
  if (safeAov === 0 || winBackScore === 0) return 0;

  const potential = safeAov * (0.6 * purchaseProbability + 0.4 * winBackScore);
  return Math.round(potential * 100) / 100;
}


export function calculateConfidenceScore(
  winBackScore: number,
  frequencyScore: number,
  monetaryScore: number,
): number {
  const conf =
    winBackScore * 0.5 +
    (frequencyScore / 100) * 0.3 +
    (monetaryScore / 100) * 0.2;

  return Math.round(Math.min(1.0, Math.max(0.2, conf)) * 100) / 100;
}

export function generateExplainableReason(
  customer: Customer,
  daysSince: number,
): string {
  const parts: string[] = [];

  if (daysSince >= 365 && !customer.lastPurchaseDate) {
    parts.push("Customer has no recorded purchase history yet");
  } else {
    parts.push(`Customer has not purchased for ${daysSince} days`);
  }

  if (customer.purchaseCount > 0) {
    parts.push(
      `previously completed ${customer.purchaseCount} order${
        customer.purchaseCount > 1 ? "s" : ""
      }`,
    );
  }

  if (customer.totalPurchaseAmount > 0) {
    parts.push(
      `has spent a total of $${customer.totalPurchaseAmount.toLocaleString()}`,
    );
  }

  return parts.join(", ") + ".";
}

export function generateRecommendedAction(
  segment: string,
  riskTier: ChurnRiskTier,
  winBackScore: number,
): string {
  if (riskTier === "critical" || segment === "Lost") {
    return "Execute high-urgency win-back sequence with a 20% reactivation discount.";
  }
  if (segment === "VIP" || segment === "High Value") {
    return "Deliver VIP executive check-in with priority support and loyalty tier rewards.";
  }
  if (segment === "At Risk") {
    return "Send automated re-engagement offer highlighting newest catalog additions.";
  }
  if (segment === "Dormant") {
    return "Deploy customer feedback survey with complimentary account credit incentive.";
  }
  if (segment === "New") {
    return "Schedule second-order welcome walkthrough with onboarding assistance.";
  }
  if (winBackScore > 0.6) {
    return "Trigger personalized multi-channel recovery reminder.";
  }

  return "Maintain standard engagement cadence with periodic product updates.";
}

export function analyzeCustomerOpportunity(
  customer: Customer,
  settings: CustomerIntelligenceSettings = DEFAULT_INTELLIGENCE_SETTINGS,
): CustomerOpportunity {
  const daysSince = getDaysSinceLastPurchase(customer.lastPurchaseDate);
  const recencyScore = calculateRecencyScore(
    daysSince,
    settings.inactivityThresholdDays,
  );
  const frequencyScore = calculateFrequencyScore(
    customer.purchaseCount,
    settings.targetPurchaseFrequency,
  );
  const monetaryScore = calculateMonetaryScore(
    customer.totalPurchaseAmount,
    settings.highValueSpendThreshold,
  );
  const engagementScore = calculateEngagementScore(
    customer.consentStatus,
    customer.optOutStatus,
    customer.lastContactDate,
  );
  const customerValueScore = calculateCustomerValueScore(
    recencyScore,
    frequencyScore,
    monetaryScore,
  );

  const rfm: CustomerRFMScore = {
    recencyScore,
    frequencyScore,
    monetaryScore,
    engagementScore,
    customerValueScore,
    daysSinceLastPurchase: daysSince,
  };

  const { churnRisk, tier: churnRiskTier } = calculateChurnRisk(
    daysSince,
    customer.purchaseCount,
    customer.optOutStatus,
    settings.inactivityThresholdDays,
    settings.atRiskThresholdDays,
    settings.dormantThresholdDays,
  );

  const winBackScore = calculateWinBackScore(
    monetaryScore,
    frequencyScore,
    daysSince,
    customer.optOutStatus,
  );

  const purchaseProbability = calculatePurchaseProbability(
    churnRisk,
    winBackScore,
  );

  const potentialRevenue = calculatePotentialRevenue(
    customer.averageOrderValue,
    purchaseProbability,
    winBackScore,
  );

  const confidenceScore = calculateConfidenceScore(
    winBackScore,
    frequencyScore,
    monetaryScore,
  );

  const segment = classifyCustomerSegment(customer, rfm, settings);
  const reason = generateExplainableReason(customer, daysSince);
  const recommendedAction = generateRecommendedAction(
    segment,
    churnRiskTier,
    winBackScore,
  );

  return {
    customerId: customer.id,
    customerName: customer.name,
    customerEmail: customer.email,
    company: customer.company,
    phone: customer.phone,
    segment,
    churnRisk,
    churnRiskTier,
    winBackScore,
    purchaseProbability,
    potentialRevenue,
    confidenceScore,
    reason,
    recommendedAction,
    totalPurchaseAmount: customer.totalPurchaseAmount,
    purchaseCount: customer.purchaseCount,
    averageOrderValue: customer.averageOrderValue,
    lastPurchaseDate: customer.lastPurchaseDate,
    rfm,
  };
}
