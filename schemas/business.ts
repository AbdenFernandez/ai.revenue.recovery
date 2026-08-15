import { z } from "zod";

export const roleSchema = z.enum(["OWNER", "ADMIN", "MEMBER"]);

export const createBusinessSchema = z.object({
  name: z.string().trim().min(2, "Business name must be at least 2 characters").max(100),
});

export type CreateBusinessInput = z.infer<typeof createBusinessSchema>;

export const updateBusinessSchema = z.object({
  name: z.string().trim().min(2, "Business name must be at least 2 characters").max(100),
});

export type UpdateBusinessInput = z.infer<typeof updateBusinessSchema>;

export const addMemberSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  role: roleSchema.default("MEMBER"),
});

export type AddMemberInput = z.infer<typeof addMemberSchema>;

export const updateMemberRoleSchema = z.object({
  role: roleSchema,
});

export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;

export const updatePreferencesSchema = z.object({
  currency: z
    .string()
    .trim()
    .length(3, "Currency must be a 3-letter ISO code (e.g. USD)")
    .transform((v) => v.toUpperCase())
    .optional(),
  timezone: z.string().trim().min(1, "Timezone is required").optional(),
  inactivityThresholdDays: z
    .number()
    .int()
    .min(7, "Minimum threshold is 7 days")
    .max(365, "Maximum threshold is 365 days")
    .optional(),
  recoveryRateTarget: z
    .number()
    .min(0.01, "Minimum recovery target is 1%")
    .max(1.0, "Maximum recovery target is 100%")
    .optional(),
  aiTonePreference: z
    .enum(["professional", "friendly", "urgent", "empathetic"])
    .optional(),
});

export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
