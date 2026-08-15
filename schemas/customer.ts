import { z } from "zod";

export const customerStatusSchema = z.enum([
  "active",
  "inactive",
  "lost",
  "churned",
  "recovered",
]);

export const createCustomerSchema = z.object({
  name: z.string().trim().min(1, "Customer name is required").max(120),
  email: z.string().trim().email("Invalid email address").max(320),
  phone: z.string().trim().max(40).nullable().optional(),
  company: z.string().trim().max(120).nullable().optional(),
  lastPurchaseDate: z.string().datetime().nullable().optional(),
  totalPurchaseAmount: z.number().min(0, "Total amount cannot be negative").default(0),
  purchaseCount: z.number().int().min(0, "Purchase count cannot be negative").default(0),
  serviceType: z.string().trim().max(80).nullable().optional(),
  customerStatus: customerStatusSchema.default("active"),
  consentStatus: z.boolean().default(true),
  optOutStatus: z.boolean().default(false),
});

export type CreateCustomerInput = z.input<typeof createCustomerSchema>;


export const updateCustomerSchema = z.object({
  name: z.string().trim().min(1, "Customer name is required").max(120).optional(),
  email: z.string().trim().email("Invalid email address").max(320).optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  company: z.string().trim().max(120).nullable().optional(),
  lastPurchaseDate: z.string().datetime().nullable().optional(),
  totalPurchaseAmount: z.number().min(0, "Total amount cannot be negative").optional(),
  purchaseCount: z.number().int().min(0, "Purchase count cannot be negative").optional(),
  serviceType: z.string().trim().max(80).nullable().optional(),
  customerStatus: customerStatusSchema.optional(),
  consentStatus: z.boolean().optional(),
  optOutStatus: z.boolean().optional(),
});

export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;

const emptyToUndefined = (val: unknown) =>
  typeof val === "string" && val.trim() === "" ? undefined : val;

export const customerQuerySchema = z.object({
  search: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  status: z.preprocess(
    emptyToUndefined,
    z
      .enum(["active", "inactive", "lost", "churned", "recovered", "all"])
      .optional(),
  ),
  serviceType: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  minAmount: z.preprocess(
    emptyToUndefined,
    z.coerce.number().min(0).optional(),
  ),
  maxAmount: z.preprocess(
    emptyToUndefined,
    z.coerce.number().min(0).optional(),
  ),
  optOut: z.preprocess(
    emptyToUndefined,
    z.preprocess(
      (v) => (v === "true" ? true : v === "false" ? false : v),
      z.boolean().optional(),
    ),
  ),
  startDate: z.preprocess(emptyToUndefined, z.string().optional()),
  endDate: z.preprocess(emptyToUndefined, z.string().optional()),
  sortBy: z.preprocess(
    emptyToUndefined,
    z
      .enum([
        "name",
        "email",
        "company",
        "totalPurchaseAmount",
        "purchaseCount",
        "averageOrderValue",
        "lastPurchaseDate",
        "createdAt",
      ])
      .default("createdAt"),
  ),
  sortOrder: z.preprocess(
    emptyToUndefined,
    z.enum(["asc", "desc"]).default("desc"),
  ),
  page: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).default(1),
  ),
  pageSize: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).max(100).default(20),
  ),
});


export type CustomerQueryInput = z.infer<typeof customerQuerySchema>;

export const previewImportSchema = z.object({
  csvText: z.string().min(1, "CSV content cannot be empty"),
  mapping: z.record(z.string()).optional(),
});

export type PreviewImportInput = z.infer<typeof previewImportSchema>;

export const executeImportSchema = z.object({
  rows: z.array(createCustomerSchema).min(1, "Must provide at least one valid row to import"),
});

export type ExecuteImportInput = z.infer<typeof executeImportSchema>;
