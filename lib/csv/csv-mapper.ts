import type {
  CsvColumnMapping,
  CsvTargetField,
  CustomerStatus,
  ImportPreviewResult,
  ImportValidationRow,
} from "@/types/customer";

const SYNONYM_MAP: Record<CsvTargetField, string[]> = {
  name: [
    "name",
    "customer_name",
    "customer name",
    "full_name",
    "full name",
    "client_name",
    "client name",
    "contact_name",
    "contact name",
    "customer",
    "client",
  ],
  email: [
    "email",
    "email_address",
    "email address",
    "mail",
    "e-mail",
    "electronic_mail",
  ],
  phone: [
    "phone",
    "mobile",
    "telephone",
    "phone_number",
    "phone number",
    "cell",
    "contact_number",
  ],
  company: [
    "company",
    "company_name",
    "company name",
    "organization",
    "org",
    "account",
    "business",
    "firm",
  ],
  lastPurchaseDate: [
    "last_purchase",
    "last purchase",
    "purchase_date",
    "purchase date",
    "last_order_date",
    "last order date",
    "last_bought",
    "last_order",
    "last order",
    "last_transaction",
  ],
  totalPurchaseAmount: [
    "amount",
    "total_amount",
    "total amount",
    "revenue",
    "total_spent",
    "total spent",
    "spend",
    "total_purchase_amount",
    "total purchase amount",
    "ltv",
    "sales",
  ],
  purchaseCount: [
    "purchase_count",
    "purchase count",
    "orders",
    "order_count",
    "order count",
    "num_orders",
    "transactions",
    "total_orders",
    "count",
  ],
  serviceType: [
    "service",
    "service_type",
    "service type",
    "plan",
    "plan_type",
    "product",
    "tier",
    "category",
    "package",
  ],
  customerStatus: [
    "status",
    "customer_status",
    "customer status",
    "state",
    "lifecycle_stage",
  ],
  consentStatus: [
    "consent",
    "consent_status",
    "consent status",
    "opt_in",
    "marketing_consent",
  ],
  optOutStatus: [
    "opt_out",
    "opt out",
    "opt_out_status",
    "opt out status",
    "unsubscribed",
    "dnc",
  ],
};

export function suggestMapping(headers: string[]): CsvColumnMapping {
  const mapping: CsvColumnMapping = {};
  const mappedTargets = new Set<CsvTargetField>();

  for (const header of headers) {
    const normalized = header.toLowerCase().trim().replace(/[\s_-]+/g, "_");
    let matchFound = false;

    for (const [targetField, synonyms] of Object.entries(SYNONYM_MAP) as [
      CsvTargetField,
      string[],
    ][]) {
      if (mappedTargets.has(targetField)) continue;

      const matches = synonyms.some(
        (synonym) =>
          normalized === synonym.replace(/[\s_-]+/g, "_") ||
          normalized.includes(synonym.replace(/[\s_-]+/g, "_")),
      );

      if (matches) {
        mapping[header] = targetField;
        mappedTargets.add(targetField);
        matchFound = true;
        break;
      }
    }

    if (!matchFound) {
      mapping[header] = "skip";
    }
  }

  return mapping;
}

export function validateAndTransformRows(
  rawRows: Record<string, string>[],
  headers: string[],
  mapping: CsvColumnMapping,
  existingDbEmails: Set<string>,
): ImportPreviewResult {
  const validRows: ImportValidationRow[] = [];
  const invalidRows: ImportValidationRow[] = [];
  const duplicateRows: ImportValidationRow[] = [];
  const seenEmailsInCsv = new Set<string>();

  rawRows.forEach((row, index) => {
    const rowNumber = index + 2; // Line 1 is header
    const errors: string[] = [];

    // Extract fields based on mapping
    let name = "";
    let email = "";
    let phone: string | null = null;
    let company: string | null = null;
    let lastPurchaseDate: string | null = null;
    let totalPurchaseAmount = 0;
    let purchaseCount = 0;
    let serviceType: string | null = null;
    let customerStatus: CustomerStatus = "active";
    let consentStatus = true;
    let optOutStatus = false;

    for (const [csvHeader, targetField] of Object.entries(mapping)) {
      if (targetField === "skip") continue;
      const rawVal = (row[csvHeader] ?? "").trim();
      if (!rawVal) continue;

      switch (targetField) {
        case "name":
          name = rawVal;
          break;
        case "email":
          email = rawVal.toLowerCase();
          break;
        case "phone":
          phone = rawVal;
          break;
        case "company":
          company = rawVal;
          break;
        case "serviceType":
          serviceType = rawVal;
          break;
        case "lastPurchaseDate": {
          const parsedDate = new Date(rawVal);
          if (isNaN(parsedDate.getTime())) {
            errors.push(`Invalid date format for purchase date: "${rawVal}"`);
          } else {
            lastPurchaseDate = parsedDate.toISOString();
          }
          break;
        }
        case "totalPurchaseAmount": {
          const cleaned = rawVal.replace(/[^0-9.-]+/g, "");
          const parsedNum = parseFloat(cleaned);
          if (isNaN(parsedNum) || parsedNum < 0) {
            errors.push(
              `Invalid total amount: "${rawVal}" (must be positive number)`,
            );
          } else {
            totalPurchaseAmount = Math.round(parsedNum * 100) / 100;
          }
          break;
        }
        case "purchaseCount": {
          const parsedCount = parseInt(rawVal, 10);
          if (isNaN(parsedCount) || parsedCount < 0) {
            errors.push(
              `Invalid purchase count: "${rawVal}" (must be positive integer)`,
            );
          } else {
            purchaseCount = parsedCount;
          }
          break;
        }
        case "customerStatus": {
          const lower = rawVal.toLowerCase();
          if (
            ["active", "inactive", "lost", "churned", "recovered"].includes(
              lower,
            )
          ) {
            customerStatus = lower as CustomerStatus;
          } else {
            errors.push(
              `Unknown status: "${rawVal}" (expected active, inactive, lost, churned, recovered)`,
            );
          }
          break;
        }
        case "consentStatus":
          consentStatus = !["false", "0", "no", "denied"].includes(
            rawVal.toLowerCase(),
          );
          break;
        case "optOutStatus":
          optOutStatus = ["true", "1", "yes", "opted_out", "unsubscribed"].includes(
            rawVal.toLowerCase(),
          );
          break;
      }
    }

    // Required field validation
    if (!name) {
      errors.push("Missing required field: Name");
    }

    if (!email) {
      errors.push("Missing required field: Email");
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        errors.push(`Invalid email format: "${email}"`);
      }
    }

    // Calculate Average Order Value
    const averageOrderValue =
      purchaseCount > 0
        ? Math.round((totalPurchaseAmount / purchaseCount) * 100) / 100
        : 0;

    // Check duplicate
    const isDuplicateInDb = existingDbEmails.has(email);
    const isDuplicateInCsv = seenEmailsInCsv.has(email);

    if (errors.length > 0) {
      invalidRows.push({
        rowNumber,
        raw: row,
        status: "invalid",
        errors,
      });
    } else if (isDuplicateInDb || isDuplicateInCsv) {
      const duplicateReason = isDuplicateInDb
        ? "Email already exists in database workspace"
        : "Duplicate email found earlier in this CSV";

      duplicateRows.push({
        rowNumber,
        raw: row,
        parsed: {
          name,
          email,
          phone,
          company,
          lastPurchaseDate,
          totalPurchaseAmount,
          purchaseCount,
          averageOrderValue,
          serviceType,
          customerStatus,
          consentStatus,
          optOutStatus,
        },
        status: "duplicate",
        errors: [duplicateReason],
      });
    } else {
      seenEmailsInCsv.add(email);
      validRows.push({
        rowNumber,
        raw: row,
        parsed: {
          name,
          email,
          phone,
          company,
          lastPurchaseDate,
          totalPurchaseAmount,
          purchaseCount,
          averageOrderValue,
          serviceType,
          customerStatus,
          consentStatus,
          optOutStatus,
        },
        status: "valid",
        errors: [],
      });
    }
  });

  return {
    headers,
    suggestedMapping: mapping,
    totalRows: rawRows.length,
    validRows,
    invalidRows,
    duplicateRows,
    summary: {
      total: rawRows.length,
      valid: validRows.length,
      invalid: invalidRows.length,
      duplicates: duplicateRows.length,
    },
  };
}
