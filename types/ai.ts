import type { CustomerSegment } from "./intelligence";

export type AIProviderType = "mock" | "openai" | "gemini";

export interface AICustomerRecommendation {
  segment: CustomerSegment;
  reason: string;
  recommended_action: string;
  message_angle: string;
  confidence: number; // 0.00 - 1.00
}

export interface AICampaignIdea {
  campaignTitle: string;
  targetSegment: CustomerSegment;
  strategicAngle: string;
  keyThemes: string[];
  suggestedChannels: ("email" | "sms" | "whatsapp")[];
  rationale: string;
}

export interface AIGeneratedMessage {
  subject: string;
  messageBody: string;
  callToAction: string;
  tone: string;
  rationale: string;
}

export interface AISegmentSummary {
  segment: CustomerSegment;
  healthStatus: string;
  keyOpportunity: string;
  recoveryStrategy: string;
  estimatedImpact: string;
}

export interface AIActionRecommendation {
  actionType: string;
  priority: "high" | "medium" | "low";
  rationale: string;
  expectedOutcome: string;
}

export interface MinimizedCustomerContext {
  customerName: string;
  company?: string | null;
  daysSinceLastPurchase: number;
  purchaseCount: number;
  totalPurchaseAmount: number;
  averageOrderValue: number;
  serviceType?: string | null;
  segment?: CustomerSegment;
}

export interface BusinessToneAndPolicyContext {
  businessName: string;
  aiTonePreference: string;
  currency: string;
  maxAuthorizedDiscountPercent?: number;
  guaranteesOrPolicies?: string;
}
