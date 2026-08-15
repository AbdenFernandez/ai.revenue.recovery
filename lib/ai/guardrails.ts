import type { Customer } from "@/types/customer";
import type { CustomerRFMScore, CustomerSegment } from "@/types/intelligence";
import type {
  BusinessToneAndPolicyContext,
  MinimizedCustomerContext,
} from "@/types/ai";

/**
 * Strips all sensitive PII (passwords, emails, phone numbers, payment tokens)
 * and transmits ONLY the minimal required lifecycle metrics to the AI provider.
 */
export function sanitizeCustomerContext(
  customer: Customer,
  rfm: CustomerRFMScore,
  segment: CustomerSegment,
): MinimizedCustomerContext {
  return {
    customerName: customer.name,
    company: customer.company || null,
    daysSinceLastPurchase: rfm.daysSinceLastPurchase,
    purchaseCount: customer.purchaseCount,
    totalPurchaseAmount: customer.totalPurchaseAmount,
    averageOrderValue: customer.averageOrderValue,
    serviceType: customer.serviceType || null,
    segment,
  };
}

/**
 * Builds system prompt enforcing strict anti-hallucination, brand tone, and policy constraints.
 */
export function buildSystemPromptWithGuardrails(
  business: BusinessToneAndPolicyContext,
): string {
  const maxDiscount = business.maxAuthorizedDiscountPercent ?? 15;
  const policies =
    business.guaranteesOrPolicies || "Standard satisfaction guarantee.";

  return `You are the AI Revenue Recovery Specialist for "${business.businessName}".
Your mission is to analyze customer churn risks, suggest targeted win-back campaigns, and draft personalized outreach.

STRICT OPERATIONAL & ANTI-HALLUCINATION GUARDRAILS:
1. NEVER invent or fabricate customer purchase history, past transactions, or loyalty metrics. Use only provided numbers.
2. NEVER invent unauthorized discounts, prices, guarantees, or terms. Max authorized discount is strictly ${maxDiscount}%.
3. Business guarantees & policies: "${policies}".
4. Tone of Voice: Strictly adhere to "${business.aiTonePreference}".
5. Currency: Use "${business.currency}".
6. Advisory Nature: All recommendations are strictly advisory and must provide a clear, factual rationale.
7. Output Format: Output ONLY valid, parseable JSON conforming strictly to the requested schema. No conversational preamble or postscript.`;
}
