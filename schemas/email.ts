import { z } from "zod";

export const emailDeliveryStatusEnum = z.enum([
  "PENDING",
  "SENT",
  "DELIVERED",
  "OPENED",
  "CLICKED",
  "BOUNCED",
  "FAILED",
  "SUPPRESSED",
]);

export const suppressionReasonEnum = z.enum([
  "UNSUBSCRIBED",
  "BOUNCED",
  "COMPLAINT",
  "MANUAL",
  "NO_CONSENT",
]);

// 1. Send Single Email Request Schema
export const sendSingleEmailRequestSchema = z.object({
  to: z.string().email("Valid recipient email is required"),
  subject: z.string().min(1, "Subject is required").max(200),
  html: z.string().min(1, "HTML content is required"),
  text: z.string().optional(),
  replyTo: z.string().email().optional(),
  idempotencyKey: z.string().min(1, "idempotencyKey is required"),
  metadata: z
    .object({
      businessId: z.string(),
      campaignId: z.string().optional(),
      customerId: z.string().optional(),
      variantId: z.string().optional(),
    })
    .optional(),
});

// 2. Trigger Campaign Dispatch Schema
export const triggerCampaignDispatchSchema = z.object({
  variantId: z.string().optional(),
  rateLimitPerSecond: z.number().int().min(1).max(50).default(10),
  simulateFailureRate: z.number().min(0).max(1).default(0), // for testing
});

// 3. Unsubscribe Request Schema
export const unsubscribeRequestSchema = z.object({
  token: z.string().min(1, "Unsubscribe token is required"),
  reason: z.string().trim().max(300).optional(),
});

// 4. Webhook Event Schema
export const emailWebhookEventSchema = z.object({
  event: z.enum([
    "sent",
    "delivered",
    "opened",
    "clicked",
    "bounced",
    "complained",
  ]),
  messageId: z.string().optional(),
  idempotencyKey: z.string().optional(),
  email: z.string().email(),
  timestamp: z.string().datetime().optional(),
});

export type SendSingleEmailRequestInput = z.infer<
  typeof sendSingleEmailRequestSchema
>;
export type TriggerCampaignDispatchInput = z.infer<
  typeof triggerCampaignDispatchSchema
>;
export type UnsubscribeRequestInput = z.infer<typeof unsubscribeRequestSchema>;
export type EmailWebhookEventInput = z.infer<typeof emailWebhookEventSchema>;
