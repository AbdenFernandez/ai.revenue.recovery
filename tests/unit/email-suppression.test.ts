import { describe, it, expect, beforeEach } from "vitest";
import { suppressionRepository } from "@/repositories/suppression-repository";
import { customerRepository } from "@/repositories/customer-repository";
import { emailService } from "@/services/email-service";
import { generateUnsubscribeToken } from "@/lib/email/tokens";
import type { Customer } from "@/types/customer";

describe("Email Suppression & Consent Enforcement", () => {
  const businessId = "biz-suppression-test";

  beforeEach(() => {
    suppressionRepository.clearStore();
    customerRepository.clearMocks();
  });

  it("adds and verifies email in suppression list", async () => {
    expect(await suppressionRepository.isSuppressed(businessId, "user@domain.com")).toBe(false);

    await suppressionRepository.addSuppression(
      businessId,
      "User@Domain.com", // case-insensitive check
      "UNSUBSCRIBED",
    );

    expect(await suppressionRepository.isSuppressed(businessId, "user@domain.com")).toBe(true);
    expect(await suppressionRepository.isSuppressed(businessId, "other@domain.com")).toBe(false);
  });

  it("suppresses customers with optOutStatus = true", async () => {
    const customer: Customer = {
      id: "cust-optout",
      businessId,
      name: "Opted Out User",
      email: "optout@example.com",
      phone: null,
      company: null,
      serviceType: null,
      totalPurchaseAmount: 100,
      purchaseCount: 1,
      averageOrderValue: 100,
      lastPurchaseDate: new Date().toISOString(),
      lastContactDate: null,
      customerStatus: "active",
      optOutStatus: true,
      consentStatus: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const check = await emailService.isCustomerSuppressed(businessId, customer);
    expect(check.isSuppressed).toBe(true);
    expect(check.reason).toBe("UNSUBSCRIBED");
  });

  it("suppresses customers with consentStatus = false", async () => {
    const customer: Customer = {
      id: "cust-noconsent",
      businessId,
      name: "No Consent User",
      email: "noconsent@example.com",
      phone: null,
      company: null,
      serviceType: null,
      totalPurchaseAmount: 100,
      purchaseCount: 1,
      averageOrderValue: 100,
      lastPurchaseDate: new Date().toISOString(),
      lastContactDate: null,
      customerStatus: "active",
      optOutStatus: false,
      consentStatus: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };


    const check = await emailService.isCustomerSuppressed(businessId, customer);
    expect(check.isSuppressed).toBe(true);
    expect(check.reason).toBe("NO_CONSENT");
  });

  it("processes public 1-click unsubscribe and updates customer record & suppression list", async () => {
    // 1. Seed customer in repository
    const customer = await customerRepository.create(businessId, {
      name: "Alice Smith",
      email: "alice@example.com",
      optOutStatus: false,
      consentStatus: true,
      totalPurchaseAmount: 500,
      purchaseCount: 2,
    });

    expect(customer.optOutStatus).toBe(false);

    // 2. Generate unsubscribe token
    const token = generateUnsubscribeToken(
      businessId,
      customer.id,
      customer.email,
    );

    // 3. Process unsubscribe
    const result = await emailService.processUnsubscribe(token);


    expect(result.success).toBe(true);
    expect(result.email).toBe("alice@example.com");

    // 4. Verify suppression list updated
    const isSuppressed = await suppressionRepository.isSuppressed(
      businessId,
      "alice@example.com",
    );
    expect(isSuppressed).toBe(true);

    // 5. Verify customer record updated
    const updatedCustomer = await customerRepository.findById(
      businessId,
      customer.id,
    );
    expect(updatedCustomer?.optOutStatus).toBe(true);
    expect(updatedCustomer?.consentStatus).toBe(false);
  });
});
