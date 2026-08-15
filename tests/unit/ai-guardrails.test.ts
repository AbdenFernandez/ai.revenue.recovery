import { describe, expect, it } from "vitest";
import {
  buildSystemPromptWithGuardrails,
  sanitizeCustomerContext,
} from "@/lib/ai/guardrails";
import type { Customer } from "@/types/customer";
import type { CustomerRFMScore } from "@/types/intelligence";
import type { BusinessToneAndPolicyContext } from "@/types/ai";

describe("AI Guardrails & Data Minimization", () => {
  const fullCustomer: Customer = {
    id: "cust-private-123",
    businessId: "biz-private-456",
    name: "Jane Doe",
    email: "jane.doe@confidential-corp.com",
    phone: "+1-555-0199",
    company: "Acme Industries",
    lastPurchaseDate: new Date("2026-05-15T00:00:00Z").toISOString(),
    totalPurchaseAmount: 3400,
    purchaseCount: 5,
    averageOrderValue: 680,
    lastContactDate: null,
    serviceType: "Pro Suite",
    customerStatus: "active",
    consentStatus: true,
    optOutStatus: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const rfm: CustomerRFMScore = {
    recencyScore: 75,
    frequencyScore: 80,
    monetaryScore: 85,
    engagementScore: 70,
    customerValueScore: 80,
    daysSinceLastPurchase: 92,
  };

  it("minimizes customer data and strips sensitive PII (emails, phone numbers, IDs)", () => {
    const minimized = sanitizeCustomerContext(fullCustomer, rfm, "Win Back");

    expect(minimized.customerName).toBe("Jane Doe");
    expect(minimized.company).toBe("Acme Industries");
    expect(minimized.daysSinceLastPurchase).toBe(92);
    expect(minimized.purchaseCount).toBe(5);
    expect(minimized.totalPurchaseAmount).toBe(3400);
    expect(minimized.averageOrderValue).toBe(680);
    expect(minimized.serviceType).toBe("Pro Suite");
    expect(minimized.segment).toBe("Win Back");

    // Verify sensitive PII is absent from minimized object
    const untyped = minimized as unknown as Record<string, unknown>;
    expect(untyped["email"]).toBeUndefined();
    expect(untyped["phone"]).toBeUndefined();
    expect(untyped["id"]).toBeUndefined();
    expect(untyped["businessId"]).toBeUndefined();
  });

  it("builds strict system prompt enforcing tone, currency, and anti-hallucination limits", () => {
    const context: BusinessToneAndPolicyContext = {
      businessName: "CloudScale Inc",
      aiTonePreference: "professional",
      currency: "EUR",
      maxAuthorizedDiscountPercent: 15,
      guaranteesOrPolicies: "30-day money-back guarantee.",
    };

    const prompt = buildSystemPromptWithGuardrails(context);

    expect(prompt).toContain('CloudScale Inc');
    expect(prompt).toContain('professional');
    expect(prompt).toContain('EUR');
    expect(prompt).toContain('15%');
    expect(prompt).toContain('30-day money-back guarantee');
    expect(prompt).toContain('NEVER invent or fabricate customer purchase history');
    expect(prompt).toContain('NEVER invent unauthorized discounts');
  });
});
