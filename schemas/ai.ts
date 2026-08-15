import { z } from "zod";

const customerSegmentEnum = z.enum([
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

// 1. Structured AI Output Schemas
export const customerRecommendationSchema = z.object({
  segment: customerSegmentEnum,
  reason: z.string().min(1, "Reason is required"),
  recommended_action: z.string().min(1, "Recommended action is required"),
  message_angle: z.string().min(1, "Message angle is required"),
  confidence: z.number().min(0).max(1),
});

export const campaignIdeaSchema = z.object({
  campaignTitle: z.string().min(1, "Campaign title is required"),
  targetSegment: customerSegmentEnum,
  strategicAngle: z.string().min(1, "Strategic angle is required"),
  keyThemes: z.array(z.string()).min(1, "At least one key theme is required"),
  suggestedChannels: z
    .array(z.enum(["email", "sms", "whatsapp"]))
    .min(1, "At least one channel is required"),
  rationale: z.string().min(1, "Rationale is required"),
});

export const messageGenerationSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  messageBody: z.string().min(1, "Message body is required"),
  callToAction: z.string().min(1, "Call to action is required"),
  tone: z.string().min(1, "Tone is required"),
  rationale: z.string().min(1, "Rationale is required"),
});

export const segmentSummarySchema = z.object({
  segment: customerSegmentEnum,
  healthStatus: z.string().min(1, "Health status is required"),
  keyOpportunity: z.string().min(1, "Key opportunity is required"),
  recoveryStrategy: z.string().min(1, "Recovery strategy is required"),
  estimatedImpact: z.string().min(1, "Estimated impact is required"),
});

export const actionRecommendationSchema = z.object({
  actionType: z.string().min(1, "Action type is required"),
  priority: z.enum(["high", "medium", "low"]),
  rationale: z.string().min(1, "Rationale is required"),
  expectedOutcome: z.string().min(1, "Expected outcome is required"),
});

// 2. Request Input Schemas for API Endpoints
export const analyzeCustomerRequestSchema = z.object({
  customerId: z.string().min(1, "customerId is required"),
});

export const generateCampaignRequestSchema = z.object({
  segment: customerSegmentEnum,
  goal: z.string().trim().optional(),
  maxDiscountPercent: z.number().min(0).max(100).optional(),
});

export const generateMessageRequestSchema = z.object({
  customerId: z.string().min(1, "customerId is required"),
  channel: z.enum(["email", "sms", "whatsapp"]).default("email"),
  customTone: z.string().trim().optional(),
  incentiveOffer: z.string().trim().optional(),
});

export const summarizeSegmentRequestSchema = z.object({
  segment: customerSegmentEnum,
});

export type AnalyzeCustomerRequestInput = z.infer<
  typeof analyzeCustomerRequestSchema
>;
export type GenerateCampaignRequestInput = z.infer<
  typeof generateCampaignRequestSchema
>;
export type GenerateMessageRequestInput = z.infer<
  typeof generateMessageRequestSchema
>;
export type SummarizeSegmentRequestInput = z.infer<
  typeof summarizeSegmentRequestSchema
>;
