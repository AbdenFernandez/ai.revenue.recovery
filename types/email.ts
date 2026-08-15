export type EmailDeliveryStatus =
  | "PENDING"
  | "SENT"
  | "DELIVERED"
  | "OPENED"
  | "CLICKED"
  | "BOUNCED"
  | "FAILED"
  | "SUPPRESSED";

export type SuppressionReason =
  | "UNSUBSCRIBED"
  | "BOUNCED"
  | "COMPLAINT"
  | "MANUAL"
  | "NO_CONSENT";

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  from?: string;
  replyTo?: string;
  headers?: Record<string, string>;
  idempotencyKey: string;
  metadata?: {
    businessId: string;
    campaignId?: string;
    customerId?: string;
    variantId?: string;
  };
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  status: EmailDeliveryStatus;
  error?: string;
  timestamp: string;
}

export interface SendBatchResult {
  total: number;
  sent: number;
  failed: number;
  suppressed: number;
  results: SendEmailResult[];
}

export interface EmailDispatchLog {
  id: string;
  businessId: string;
  campaignId: string;
  customerId: string;
  variantId: string;
  recipientEmail: string;
  idempotencyKey: string;
  status: EmailDeliveryStatus;
  errorMessage: string | null;
  retryCount: number;
  sentAt: string | null;
  deliveredAt: string | null;
  openedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SuppressionEntry {
  id: string;
  businessId: string;
  email: string;
  reason: SuppressionReason;
  createdAt: string;
}

export interface UnsubscribeTokenPayload {
  businessId: string;
  customerId: string;
  email: string;
  exp: number;
}

export interface CampaignDispatchSummary {
  campaignId: string;
  totalTargeted: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  suppressedCount: number;
  duplicatesSkipped: number;
  completed: boolean;
}
