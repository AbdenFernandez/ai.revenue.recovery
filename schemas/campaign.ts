import { z } from "zod";

export const campaignSegmentEnum = z.enum([
  "VIP",
  "High Value",
  "Active",
  "At Risk",
  "Dormant",
  "Lost",
  "Win Back",
  "New",
  "Potential High Value",
]);

export const campaignChannelEnum = z.enum(["email", "sms", "whatsapp"]);

export const campaignStatusEnum = z.enum([
  "DRAFT",
  "READY",
  "SCHEDULED",
  "RUNNING",
  "PAUSED",
  "COMPLETED",
  "FAILED",
]);

// 1. Creation Schema
export const createCampaignRequestSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Campaign name is required")
    .max(120, "Campaign name cannot exceed 120 characters"),
  description: z.string().trim().max(500).optional().nullable(),
  targetSegment: campaignSegmentEnum,
  channel: campaignChannelEnum.default("email"),
  customGoal: z.string().trim().max(300).optional(),
  maxDiscountPercent: z.number().min(0).max(100).optional().default(15),
  scheduledAt: z.string().datetime().optional().nullable(),
});

// 2. Update Schema
export const updateCampaignRequestSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(500).optional().nullable(),
  scheduledAt: z.string().datetime().optional().nullable(),
});

// 3. Approval Schema
export const approveCampaignRequestSchema = z.object({
  approvedVariantId: z.string().min(1, "approvedVariantId is required"),
});

// 4. Audience Estimation Schema
export const estimateAudienceRequestSchema = z.object({
  targetSegment: campaignSegmentEnum,
});

// 5. Query Filters Schema
export const campaignListQuerySchema = z.object({
  status: campaignStatusEnum.optional(),
  targetSegment: campaignSegmentEnum.optional(),
  channel: campaignChannelEnum.optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export type CreateCampaignRequestInput = z.infer<
  typeof createCampaignRequestSchema
>;
export type UpdateCampaignRequestInput = z.infer<
  typeof updateCampaignRequestSchema
>;
export type ApproveCampaignRequestInput = z.infer<
  typeof approveCampaignRequestSchema
>;
export type EstimateAudienceRequestInput = z.infer<
  typeof estimateAudienceRequestSchema
>;
export type CampaignListQueryInput = z.infer<typeof campaignListQuerySchema>;
