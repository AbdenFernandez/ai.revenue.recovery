import type { CustomerSegment } from "./intelligence";

export type CampaignStatus =
  | "DRAFT"
  | "READY"
  | "SCHEDULED"
  | "RUNNING"
  | "PAUSED"
  | "COMPLETED"
  | "FAILED";

export type CampaignChannel = "email" | "sms" | "whatsapp";

export interface Campaign {
  id: string;
  businessId: string;
  name: string;
  description: string | null;
  targetSegment: CustomerSegment;
  channel: CampaignChannel;
  status: CampaignStatus;
  audienceCount: number;
  estimatedOpportunity: number;
  strategyRationale: string | null;
  scheduledAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignVariant {
  id: string;
  campaignId: string;
  businessId: string;
  variantLabel: string; // e.g. "Variant A - Direct Value", "Variant B - Warm Concierge"
  subject: string | null;
  messageBody: string;
  callToAction: string;
  tone: string;
  isApproved: boolean;
  createdAt: string;
}

export interface CampaignAnalytics {
  campaignId: string;
  businessId: string;
  targeted: number;
  prepared: number;
  sent: number;
  delivered: number;
  opened: number;
  replied: number;
  converted: number;
  revenueAttributed: number;
  updatedAt: string;
}

export interface CampaignWithDetails extends Campaign {
  variants: CampaignVariant[];
  analytics: CampaignAnalytics;
}

export interface CreateCampaignInput {
  name: string;
  description?: string | null;
  targetSegment: CustomerSegment;
  channel: CampaignChannel;
  customGoal?: string;
  maxDiscountPercent?: number;
  scheduledAt?: string | null;
}

export interface UpdateCampaignInput {
  name?: string;
  description?: string | null;
  scheduledAt?: string | null;
}

export interface AudienceEstimation {
  segment: CustomerSegment;
  audienceCount: number;
  totalEstimatedRevenue: number;
  averageConfidence: number;
  currency: string;
}

export interface CampaignListFilters {
  status?: CampaignStatus;
  targetSegment?: CustomerSegment;
  channel?: CampaignChannel;
  search?: string;
  page?: number;
  limit?: number;
}
