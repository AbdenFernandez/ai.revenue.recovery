import type {
  AIActionRecommendation,
  AICampaignIdea,
  AICustomerRecommendation,
  AIGeneratedMessage,
  AISegmentSummary,
  BusinessToneAndPolicyContext,
  MinimizedCustomerContext,
} from "@/types/ai";
import type { CustomerSegment } from "@/types/intelligence";

export interface CustomerAnalysisPromptInput {
  customer: MinimizedCustomerContext;
  business: BusinessToneAndPolicyContext;
}

export interface CampaignPromptInput {
  segment: CustomerSegment;
  business: BusinessToneAndPolicyContext;
  goal?: string;
  maxDiscountPercent?: number;
  segmentStats?: {
    customerCount: number;
    avgSpend: number;
    avgDaysInactive: number;
  };
}

export interface MessagePromptInput {
  customer: MinimizedCustomerContext;
  business: BusinessToneAndPolicyContext;
  channel: "email" | "sms" | "whatsapp";
  customTone?: string;
  incentiveOffer?: string;
}

export interface SegmentSummaryPromptInput {
  segment: CustomerSegment;
  business: BusinessToneAndPolicyContext;
  segmentStats?: {
    customerCount: number;
    totalRevenue: number;
  };
}

export interface ActionPromptInput {
  customer: MinimizedCustomerContext;
  business: BusinessToneAndPolicyContext;
}

export interface AIProvider {
  readonly name: string;
  analyzeCustomer(
    input: CustomerAnalysisPromptInput,
  ): Promise<AICustomerRecommendation>;
  generateCampaign(input: CampaignPromptInput): Promise<AICampaignIdea>;
  generateMessage(input: MessagePromptInput): Promise<AIGeneratedMessage>;
  summarizeSegment(
    input: SegmentSummaryPromptInput,
  ): Promise<AISegmentSummary>;
  recommendAction(
    input: ActionPromptInput,
  ): Promise<AIActionRecommendation>;
}
