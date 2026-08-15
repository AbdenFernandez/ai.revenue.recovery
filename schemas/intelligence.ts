import { z } from "zod";

const emptyToUndefined = (val: unknown) =>
  typeof val === "string" && val.trim() === "" ? undefined : val;

export const opportunitiesQuerySchema = z.object({
  segment: z.preprocess(
    emptyToUndefined,
    z
      .enum([
        "VIP",
        "High Value",
        "Active",
        "At Risk",
        "Dormant",
        "Lost",
        "Win Back",
        "New",
        "Potential High Value",
        "all",
      ])
      .optional(),
  ),
  riskTier: z.preprocess(
    emptyToUndefined,
    z.enum(["low", "medium", "high", "critical", "all"]).optional(),
  ),
  minPotentialRevenue: z.preprocess(
    emptyToUndefined,
    z.coerce.number().min(0).optional(),
  ),
  search: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  sortBy: z.preprocess(
    emptyToUndefined,
    z
      .enum([
        "potentialRevenue",
        "winBackScore",
        "churnRisk",
        "totalPurchaseAmount",
      ])
      .default("potentialRevenue"),
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

export type OpportunitiesQueryInput = z.infer<typeof opportunitiesQuerySchema>;

export const intelligenceSettingsSchema = z.object({
  inactivityThresholdDays: z.coerce.number().int().min(1).max(365).default(60),
  atRiskThresholdDays: z.coerce.number().int().min(1).max(365).default(90),
  dormantThresholdDays: z.coerce.number().int().min(1).max(730).default(180),
  highValueSpendThreshold: z.coerce.number().min(0).default(1000),
  vipSpendThreshold: z.coerce.number().min(0).default(2500),
  targetPurchaseFrequency: z.coerce.number().int().min(1).max(50).default(5),
});

export type IntelligenceSettingsInput = z.infer<
  typeof intelligenceSettingsSchema
>;
