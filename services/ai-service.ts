import { assertTenantAccess } from "@/lib/auth/authorization";
import { AppError } from "@/lib/errors";
import { memberRepository } from "@/repositories/member-repository";
import { businessRepository } from "@/repositories/business-repository";
import { preferencesRepository } from "@/repositories/preferences-repository";
import { customerRepository } from "@/repositories/customer-repository";
import { AIProviderFactory } from "@/lib/ai/provider-factory";
import { sanitizeCustomerContext } from "@/lib/ai/guardrails";
import {
  analyzeCustomerOpportunity,
  DEFAULT_INTELLIGENCE_SETTINGS,
} from "@/lib/intelligence/scoring-engine";
import type {
  AICampaignIdea,
  AICustomerRecommendation,
  AIGeneratedMessage,
  AISegmentSummary,
  BusinessToneAndPolicyContext,
} from "@/types/ai";
import type { CustomerSegment } from "@/types/intelligence";

export class AIService {
  private async getBusinessToneContext(
    businessId: string,
  ): Promise<BusinessToneAndPolicyContext> {
    const [business, prefs] = await Promise.all([
      businessRepository.findById(businessId),
      preferencesRepository.findByBusinessId(businessId),
    ]);

    return {
      businessName: business?.name || "Our Business",
      aiTonePreference: prefs?.aiTonePreference || "friendly",
      currency: prefs?.currency || "USD",
      maxAuthorizedDiscountPercent: 20,
      guaranteesOrPolicies: "Standard 30-day satisfaction guarantee.",
    };
  }

  async analyzeCustomer(
    userId: string,
    businessId: string,
    customerId: string,
  ): Promise<AICustomerRecommendation> {
    const userMemberships = await memberRepository.findByUserId(userId);
    assertTenantAccess(userMemberships, businessId);

    const customer = await customerRepository.findById(businessId, customerId);
    if (!customer) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Customer not found.",
      });
    }

    const opportunity = analyzeCustomerOpportunity(
      customer,
      DEFAULT_INTELLIGENCE_SETTINGS,
    );
    const minimized = sanitizeCustomerContext(
      customer,
      opportunity.rfm,
      opportunity.segment,
    );
    const businessContext = await this.getBusinessToneContext(businessId);

    const provider = AIProviderFactory.getProvider();
    return provider.analyzeCustomer({
      customer: minimized,
      business: businessContext,
    });
  }

  async generateCampaign(
    userId: string,
    businessId: string,
    segment: CustomerSegment,
    goal?: string,
    maxDiscountPercent?: number,
  ): Promise<AICampaignIdea> {
    const userMemberships = await memberRepository.findByUserId(userId);
    assertTenantAccess(userMemberships, businessId);

    const businessContext = await this.getBusinessToneContext(businessId);
    if (maxDiscountPercent !== undefined) {
      businessContext.maxAuthorizedDiscountPercent = maxDiscountPercent;
    }

    const provider = AIProviderFactory.getProvider();
    return provider.generateCampaign({
      segment,
      business: businessContext,
      goal,
      maxDiscountPercent,
    });
  }

  async generateMessage(
    userId: string,
    businessId: string,
    customerId: string,
    channel: "email" | "sms" | "whatsapp" = "email",
    customTone?: string,
    incentiveOffer?: string,
  ): Promise<AIGeneratedMessage> {
    const userMemberships = await memberRepository.findByUserId(userId);
    assertTenantAccess(userMemberships, businessId);

    const customer = await customerRepository.findById(businessId, customerId);
    if (!customer) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Customer not found.",
      });
    }

    const opportunity = analyzeCustomerOpportunity(
      customer,
      DEFAULT_INTELLIGENCE_SETTINGS,
    );
    const minimized = sanitizeCustomerContext(
      customer,
      opportunity.rfm,
      opportunity.segment,
    );
    const businessContext = await this.getBusinessToneContext(businessId);

    const provider = AIProviderFactory.getProvider();
    return provider.generateMessage({
      customer: minimized,
      business: businessContext,
      channel,
      customTone,
      incentiveOffer,
    });
  }

  async summarizeSegment(
    userId: string,
    businessId: string,
    segment: CustomerSegment,
  ): Promise<AISegmentSummary> {
    const userMemberships = await memberRepository.findByUserId(userId);
    assertTenantAccess(userMemberships, businessId);

    const businessContext = await this.getBusinessToneContext(businessId);
    const provider = AIProviderFactory.getProvider();

    return provider.summarizeSegment({
      segment,
      business: businessContext,
    });
  }
}

export const aiService = new AIService();
