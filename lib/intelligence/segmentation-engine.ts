import type { Customer } from "@/types/customer";
import type {
  CustomerIntelligenceSettings,
  CustomerRFMScore,
  CustomerSegment,
} from "@/types/intelligence";

export function classifyCustomerSegment(
  customer: Customer,
  rfm: CustomerRFMScore,
  settings: CustomerIntelligenceSettings,
): CustomerSegment {
  const { daysSinceLastPurchase } = rfm;
  const { totalPurchaseAmount, purchaseCount, averageOrderValue, optOutStatus } =
    customer;

  // 1. VIP: Top monetary spend + frequent orders + reasonable recency
  if (
    totalPurchaseAmount >= settings.vipSpendThreshold &&
    purchaseCount >= settings.targetPurchaseFrequency &&
    daysSinceLastPurchase <= settings.atRiskThresholdDays
  ) {
    return "VIP";
  }

  // 2. Win Back: High past spend or high order count that became dormant/lost, but not opted out
  if (
    !optOutStatus &&
    (totalPurchaseAmount >= settings.highValueSpendThreshold ||
      purchaseCount >= settings.targetPurchaseFrequency) &&
    daysSinceLastPurchase > settings.atRiskThresholdDays
  ) {
    return "Win Back";
  }

  // 3. High Value: Substantial spend across orders and still active/warming
  if (
    totalPurchaseAmount >= settings.highValueSpendThreshold &&
    daysSinceLastPurchase <= settings.atRiskThresholdDays
  ) {
    return "High Value";
  }

  // 4. Potential High Value: High AOV with early order count
  if (
    averageOrderValue >= settings.highValueSpendThreshold * 0.4 &&
    purchaseCount <= 3 &&
    daysSinceLastPurchase <= settings.inactivityThresholdDays
  ) {
    return "Potential High Value";
  }

  // 5. New: 1 order, recently placed
  if (
    purchaseCount === 1 &&
    daysSinceLastPurchase <= settings.inactivityThresholdDays
  ) {
    return "New";
  }

  // 6. Active: Regular buyers within normal activity window
  if (
    purchaseCount >= 2 &&
    daysSinceLastPurchase <= settings.inactivityThresholdDays
  ) {
    return "Active";
  }

  // 7. At Risk: Previously regular buyers who entered the inactivity window
  if (
    purchaseCount >= 2 &&
    daysSinceLastPurchase > settings.inactivityThresholdDays &&
    daysSinceLastPurchase <= settings.atRiskThresholdDays
  ) {
    return "At Risk";
  }

  // 8. Dormant: No purchase in at-risk to dormant window
  if (
    daysSinceLastPurchase > settings.atRiskThresholdDays &&
    daysSinceLastPurchase <= settings.dormantThresholdDays
  ) {
    return "Dormant";
  }

  // 9. Lost: Inactive beyond dormant threshold or zero activity
  return "Lost";
}
