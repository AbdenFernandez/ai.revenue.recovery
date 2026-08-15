import { describe, expect, it } from "vitest";
import {
  createCustomerSchema,
  updateCustomerSchema,
  customerQuerySchema,
} from "@/schemas/customer";

describe("Customer Schema Validation", () => {
  it("validates valid customer creation input", () => {
    const input = {
      name: "Alice Johnson",
      email: "alice@example.com",
      phone: "+15551234567",
      company: "Acme Corp",
      totalPurchaseAmount: 450.5,
      purchaseCount: 3,
      serviceType: "Enterprise Plan",
      customerStatus: "active" as const,
    };

    const parsed = createCustomerSchema.parse(input);
    expect(parsed.name).toBe("Alice Johnson");
    expect(parsed.totalPurchaseAmount).toBe(450.5);
    expect(parsed.consentStatus).toBe(true);
    expect(parsed.optOutStatus).toBe(false);
  });

  it("rejects empty names and invalid emails", () => {
    expect(() =>
      createCustomerSchema.parse({
        name: "",
        email: "alice@example.com",
      }),
    ).toThrow();

    expect(() =>
      createCustomerSchema.parse({
        name: "Alice",
        email: "not-an-email",
      }),
    ).toThrow();
  });

  it("rejects negative financial amounts", () => {
    expect(() =>
      createCustomerSchema.parse({
        name: "Alice",
        email: "alice@example.com",
        totalPurchaseAmount: -50,
      }),
    ).toThrow();

    expect(() =>
      createCustomerSchema.parse({
        name: "Alice",
        email: "alice@example.com",
        purchaseCount: -1,
      }),
    ).toThrow();
  });

  it("coerces and validates query parameters", () => {
    const query = customerQuerySchema.parse({
      page: "2",
      pageSize: "50",
      minAmount: "100",
      sortBy: "totalPurchaseAmount",
      sortOrder: "desc",
    });

    expect(query.page).toBe(2);
    expect(query.pageSize).toBe(50);
    expect(query.minAmount).toBe(100);
    expect(query.sortBy).toBe("totalPurchaseAmount");
  });

  it("validates partial customer update input", () => {
    const parsed = updateCustomerSchema.parse({
      totalPurchaseAmount: 850,
      optOutStatus: true,
    });

    expect(parsed.totalPurchaseAmount).toBe(850);
    expect(parsed.optOutStatus).toBe(true);
    expect(parsed.name).toBeUndefined();
  });

  it("safely handles empty string query parameters without unwanted coercion", () => {
    const query = customerQuerySchema.parse({
      search: "",
      minAmount: "",
      maxAmount: "",
      serviceType: "",
      status: "",
      page: "",
      pageSize: "",
    });

    expect(query.search).toBeUndefined();
    expect(query.minAmount).toBeUndefined();
    expect(query.maxAmount).toBeUndefined();
    expect(query.serviceType).toBeUndefined();
    expect(query.status).toBeUndefined();
    expect(query.page).toBe(1);
    expect(query.pageSize).toBe(20);
  });
});



