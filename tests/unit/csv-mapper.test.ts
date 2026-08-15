import { describe, expect, it } from "vitest";
import { suggestMapping, validateAndTransformRows } from "@/lib/csv/csv-mapper";

describe("CSV Auto-Mapping & Row Validation Engine", () => {
  it("automatically detects synonyms for common column names", () => {
    const headers = [
      "Customer Name",
      "Email Address",
      "Mobile",
      "Organization",
      "Total Spent",
      "Orders",
      "Plan",
    ];

    const mapping = suggestMapping(headers);

    expect(mapping["Customer Name"]).toBe("name");
    expect(mapping["Email Address"]).toBe("email");
    expect(mapping["Mobile"]).toBe("phone");
    expect(mapping["Organization"]).toBe("company");
    expect(mapping["Total Spent"]).toBe("totalPurchaseAmount");
    expect(mapping["Orders"]).toBe("purchaseCount");
    expect(mapping["Plan"]).toBe("serviceType");
  });

  it("marks unmapped headers as skip", () => {
    const headers = ["RandomHeader", "InternalId_XYZ"];
    const mapping = suggestMapping(headers);

    expect(mapping["RandomHeader"]).toBe("skip");
    expect(mapping["InternalId_XYZ"]).toBe("skip");
  });

  it("classifies rows into valid, invalid, and duplicate categories", () => {
    const headers = ["name", "email", "amount", "orders"];
    const mapping = {
      name: "name" as const,
      email: "email" as const,
      amount: "totalPurchaseAmount" as const,
      orders: "purchaseCount" as const,
    };

    const existingDbEmails = new Set(["existing@example.com"]);

    const rawRows = [
      // 1. Valid row
      {
        name: "Alice Johnson",
        email: "alice@example.com",
        amount: "300.00",
        orders: "3",
      },
      // 2. Invalid row: missing email
      {
        name: "Bob Builder",
        email: "",
        amount: "100.00",
        orders: "1",
      },
      // 3. Invalid row: malformed email
      {
        name: "Charlie Brown",
        email: "invalid-email-format",
        amount: "50.00",
        orders: "1",
      },
      // 4. Duplicate in DB
      {
        name: "Dave Duplicate",
        email: "existing@example.com",
        amount: "200.00",
        orders: "2",
      },
      // 5. Duplicate in CSV (repeated Alice)
      {
        name: "Alice Repeated",
        email: "alice@example.com",
        amount: "150.00",
        orders: "1",
      },
    ];

    const result = validateAndTransformRows(
      rawRows,
      headers,
      mapping,
      existingDbEmails,
    );

    expect(result.summary.total).toBe(5);
    expect(result.summary.valid).toBe(1);
    expect(result.summary.invalid).toBe(2);
    expect(result.summary.duplicates).toBe(2);

    expect(result.validRows[0]?.parsed?.name).toBe("Alice Johnson");
    expect(result.validRows[0]?.parsed?.averageOrderValue).toBe(100.0);

    expect(result.invalidRows[0]?.errors).toContain(
      "Missing required field: Email",
    );
    expect(result.invalidRows[1]?.errors).toContain(
      'Invalid email format: "invalid-email-format"',
    );

    expect(result.duplicateRows[0]?.errors).toContain(
      "Email already exists in database workspace",
    );
    expect(result.duplicateRows[1]?.errors).toContain(
      "Duplicate email found earlier in this CSV",
    );
  });
});
