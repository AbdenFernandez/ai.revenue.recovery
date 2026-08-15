import { describe, expect, it } from "vitest";
import { parseCsv, formatCsv } from "@/lib/csv/csv-parser";

describe("CSV Parser & Formatter (RFC 4180)", () => {
  it("parses standard comma-separated values with headers", () => {
    const csv = "name,email,amount\nAlice,alice@example.com,150.00\nBob,bob@example.com,220.50";
    const result = parseCsv(csv);

    expect(result.headers).toEqual(["name", "email", "amount"]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual({
      name: "Alice",
      email: "alice@example.com",
      amount: "150.00",
    });
    expect(result.rows[1]).toEqual({
      name: "Bob",
      email: "bob@example.com",
      amount: "220.50",
    });
  });

  it("handles commas within quoted fields", () => {
    const csv = 'name,company,amount\n"Johnson, Alice","Acme, Inc.",500.00';
    const result = parseCsv(csv);

    expect(result.headers).toEqual(["name", "company", "amount"]);
    expect(result.rows[0]).toEqual({
      name: "Johnson, Alice",
      company: "Acme, Inc.",
      amount: "500.00",
    });
  });

  it("handles escaped quotes inside quoted fields", () => {
    const csv = 'name,notes\n"Bob ""The Builder"" Smith","Regular client"';
    const result = parseCsv(csv);

    expect(result.rows[0]).toEqual({
      name: 'Bob "The Builder" Smith',
      notes: "Regular client",
    });
  });

  it("handles Windows CRLF and Unix LF line endings", () => {
    const csv = "name,email\r\nAlice,alice@example.com\r\nBob,bob@example.com";
    const result = parseCsv(csv);

    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]?.name).toBe("Alice");
    expect(result.rows[1]?.name).toBe("Bob");
  });

  it("strips UTF-8 BOM if present", () => {
    const csv = "\uFEFFname,email\nAlice,alice@example.com";
    const result = parseCsv(csv);

    expect(result.headers[0]).toBe("name");
    expect(result.rows[0]?.name).toBe("Alice");
  });

  it("formats structured data into an RFC 4180 compliant CSV string", () => {
    const data = [
      { name: "Alice, M.", email: "alice@example.com", total: 450 },
      { name: 'Bob "Pro"', email: "bob@example.com", total: 120 },
    ];
    const columns = [
      { key: "name" as const, header: "Customer Name" },
      { key: "email" as const, header: "Email Address" },
      { key: "total" as const, header: "Total Spent" },
    ];

    const output = formatCsv(data, columns);
    expect(output).toContain("Customer Name,Email Address,Total Spent");
    expect(output).toContain('"Alice, M.",alice@example.com,450');
    expect(output).toContain('"Bob ""Pro""",bob@example.com,120');
  });

});
