import { assertRole, assertTenantAccess } from "@/lib/auth/authorization";
import { AppError } from "@/lib/errors";
import { memberRepository } from "@/repositories/member-repository";
import { businessRepository } from "@/repositories/business-repository";
import { preferencesRepository } from "@/repositories/preferences-repository";
import { customerRepository } from "@/repositories/customer-repository";
import { campaignRepository } from "@/repositories/campaign-repository";
import {
  analyzeCustomerOpportunity,
  DEFAULT_INTELLIGENCE_SETTINGS,
} from "@/lib/intelligence/scoring-engine";
import { AIProviderFactory } from "@/lib/ai/provider-factory";
import type {
  AudienceEstimation,
  Campaign,
  CampaignListFilters,
  CampaignWithDetails,
  CreateCampaignInput,
  UpdateCampaignInput,
} from "@/types/campaign";
import type { CustomerSegment } from "@/types/intelligence";
import type { PaginatedResult } from "@/types";

export class CampaignService {
  private async checkTenantAccess(userId: string, businessId: string) {
    const userMemberships = await memberRepository.findByUserId(userId);
    return assertTenantAccess(userMemberships, businessId);
  }

  private async checkAdminOrOwner(userId: string, businessId: string) {
    const userMemberships = await memberRepository.findByUserId(userId);
    return assertRole(userMemberships, businessId, "ADMIN");
  }


  async estimateAudience(
    userId: string,
    businessId: string,
    segment: CustomerSegment,
  ): Promise<AudienceEstimation> {
    await this.checkTenantAccess(userId, businessId);

    const preferences = await preferencesRepository.findByBusinessId(businessId);
    const currency = preferences?.currency || "USD";

    // Fetch all customers for business
    const customersResult = await customerRepository.list(
      businessId,
      {},
      1,
      1000,
    );
    const customers = customersResult.items;

    let matchCount = 0;
    let totalRevenue = 0;
    let totalConfidence = 0;

    for (const cust of customers) {
      // Exclude opted-out or non-consented customers
      if (cust.optOutStatus || !cust.consentStatus) {
        continue;
      }

      const opp = analyzeCustomerOpportunity(
        cust,
        DEFAULT_INTELLIGENCE_SETTINGS,
      );
      if (opp.segment === segment) {
        matchCount++;
        totalRevenue += opp.potentialRevenue;
        totalConfidence += opp.confidenceScore;
      }
    }

    const averageConfidence =
      matchCount > 0 ? totalConfidence / matchCount : 0.85;

    return {
      segment,
      audienceCount: matchCount,
      totalEstimatedRevenue: Math.round(totalRevenue * 100) / 100,
      averageConfidence: Math.round(averageConfidence * 100) / 100,
      currency,
    };
  }

  async createCampaignWithAI(
    userId: string,
    businessId: string,
    input: CreateCampaignInput,
  ): Promise<CampaignWithDetails> {
    await this.checkTenantAccess(userId, businessId);

    const business = await businessRepository.findById(businessId);
    if (!business) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Business not found.",
      });
    }

    const preferences = await preferencesRepository.findByBusinessId(businessId);
    const aiProvider = AIProviderFactory.getProvider();

    // 1. Estimate Audience & Opportunity
    const audience = await this.estimateAudience(
      userId,
      businessId,
      input.targetSegment,
    );

    // 2. Generate AI Campaign Blueprint Strategy
    const aiContext = {
      businessName: business.name,
      aiTonePreference: preferences?.aiTonePreference || "friendly",
      currency: preferences?.currency || "USD",
      maxAuthorizedDiscountPercent: input.maxDiscountPercent ?? 15,
      guaranteesOrPolicies: "Standard service satisfaction guarantee.",
    };

    const campaignBlueprint = await aiProvider.generateCampaign({
      segment: input.targetSegment,
      business: aiContext,
      goal: input.customGoal || `Reactivate ${input.targetSegment} accounts`,
      maxDiscountPercent: input.maxDiscountPercent ?? 15,
    });

    // 3. Create Campaign Entity in DRAFT Status
    const campaign = await campaignRepository.create(businessId, {
      name: input.name || campaignBlueprint.campaignTitle,
      description: input.description || campaignBlueprint.strategicAngle,
      targetSegment: input.targetSegment,
      channel: input.channel,
      audienceCount: audience.audienceCount,
      estimatedOpportunity: audience.totalEstimatedRevenue,
      strategyRationale: campaignBlueprint.rationale,
      scheduledAt: input.scheduledAt ?? null,
    });

    // 4. Generate 2 AI Message Variants (Variant A: Direct/Value vs. Variant B: Warm/Concierge)
    const discountOffer = input.maxDiscountPercent
      ? `${input.maxDiscountPercent}% exclusive loyalty savings`
      : undefined;

    const sampleCustomer = {
      customerName: "Valued Customer",
      company: "Your Team",
      daysSinceLastPurchase: 60,
      purchaseCount: 3,
      totalPurchaseAmount: 1500,
      averageOrderValue: 500,
      serviceType: "Service Subscription",
      segment: input.targetSegment,
    };

    const variantAMsg = await aiProvider.generateMessage({
      customer: sampleCustomer,
      business: aiContext,
      channel: input.channel,
      customTone: "professional",
      incentiveOffer: discountOffer,
    });

    const variantBMsg = await aiProvider.generateMessage({
      customer: sampleCustomer,
      business: aiContext,
      channel: input.channel,
      customTone: "friendly",
      incentiveOffer: discountOffer,
    });

    await campaignRepository.addVariants(businessId, campaign.id, [
      {
        variantLabel: "Variant A — Direct & Value Focused",
        subject: variantAMsg.subject,
        messageBody: variantAMsg.messageBody,
        callToAction: variantAMsg.callToAction,
        tone: variantAMsg.tone,
        isApproved: false,
      },
      {
        variantLabel: "Variant B — Warm & Relationship Focused",
        subject: variantBMsg.subject,
        messageBody: variantBMsg.messageBody,
        callToAction: variantBMsg.callToAction,
        tone: variantBMsg.tone,
        isApproved: false,
      },
    ]);

    const fullCampaign = await campaignRepository.getCampaignDetails(
      businessId,
      campaign.id,
    );
    if (!fullCampaign) {
      throw new AppError({
        code: "INTERNAL_ERROR",
        message: "Failed to retrieve generated campaign.",
      });
    }

    return fullCampaign;
  }

  async approveCampaign(
    userId: string,
    businessId: string,
    campaignId: string,
    variantId: string,
  ): Promise<CampaignWithDetails> {
    await this.checkAdminOrOwner(userId, businessId);

    const campaign = await campaignRepository.findById(businessId, campaignId);
    if (!campaign) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Campaign not found.",
      });
    }

    if (campaign.status !== "DRAFT" && campaign.status !== "READY") {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: `Cannot approve a campaign currently in ${campaign.status} status.`,
      });
    }

    const approvedVariant = await campaignRepository.approveVariant(
      businessId,
      campaignId,
      variantId,
    );
    if (!approvedVariant) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Variant not found for this campaign.",
      });
    }

    // Update status to READY
    await campaignRepository.update(businessId, campaignId, {
      status: "READY",
    });

    const fullCampaign = await campaignRepository.getCampaignDetails(
      businessId,
      campaignId,
    );
    if (!fullCampaign) {
      throw new AppError({
        code: "INTERNAL_ERROR",
        message: "Failed to retrieve campaign details.",
      });
    }

    return fullCampaign;
  }

  async launchCampaign(
    userId: string,
    businessId: string,
    campaignId: string,
  ): Promise<CampaignWithDetails> {
    await this.checkAdminOrOwner(userId, businessId);

    const campaign = await campaignRepository.getCampaignDetails(
      businessId,
      campaignId,
    );
    if (!campaign) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Campaign not found.",
      });
    }

    // Zero-Auto-Send Security Policy: Campaign MUST be in READY status with an approved variant
    if (campaign.status !== "READY" && campaign.status !== "SCHEDULED") {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: `Campaign cannot be launched from status "${campaign.status}". Campaign must be reviewed and approved first.`,
      });
    }

    const hasApprovedVariant = campaign.variants.some((v) => v.isApproved);
    if (!hasApprovedVariant) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message:
          "Cannot launch campaign: no message variant has been approved by the business.",
      });
    }

    // Transition to RUNNING
    await campaignRepository.update(businessId, campaignId, {
      status: "RUNNING",
    });

    // Update analytics funnel
    await campaignRepository.updateAnalytics(businessId, campaignId, {
      targeted: campaign.audienceCount,
      prepared: campaign.audienceCount,
      sent: campaign.audienceCount,
      delivered: Math.round(campaign.audienceCount * 0.98),
    });

    const updated = await campaignRepository.getCampaignDetails(
      businessId,
      campaignId,
    );
    if (!updated) {
      throw new AppError({
        code: "INTERNAL_ERROR",
        message: "Failed to retrieve launched campaign.",
      });
    }
    return updated;
  }

  async pauseCampaign(
    userId: string,
    businessId: string,
    campaignId: string,
  ): Promise<CampaignWithDetails> {
    await this.checkAdminOrOwner(userId, businessId);

    const campaign = await campaignRepository.findById(businessId, campaignId);
    if (!campaign) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Campaign not found.",
      });
    }

    if (campaign.status !== "RUNNING") {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: `Only running campaigns can be paused. Current status: ${campaign.status}`,
      });
    }

    await campaignRepository.update(businessId, campaignId, {
      status: "PAUSED",
    });

    const updated = await campaignRepository.getCampaignDetails(
      businessId,
      campaignId,
    );
    if (!updated) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Campaign not found.",
      });
    }
    return updated;
  }

  async resumeCampaign(
    userId: string,
    businessId: string,
    campaignId: string,
  ): Promise<CampaignWithDetails> {
    await this.checkAdminOrOwner(userId, businessId);

    const campaign = await campaignRepository.findById(businessId, campaignId);
    if (!campaign) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Campaign not found.",
      });
    }

    if (campaign.status !== "PAUSED") {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: `Only paused campaigns can be resumed. Current status: ${campaign.status}`,
      });
    }

    await campaignRepository.update(businessId, campaignId, {
      status: "RUNNING",
    });

    const updated = await campaignRepository.getCampaignDetails(
      businessId,
      campaignId,
    );
    if (!updated) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Campaign not found.",
      });
    }
    return updated;
  }

  async completeCampaign(
    userId: string,
    businessId: string,
    campaignId: string,
    finalMetrics?: {
      opened?: number;
      replied?: number;
      converted?: number;
      revenueAttributed?: number;
    },
  ): Promise<CampaignWithDetails> {
    await this.checkAdminOrOwner(userId, businessId);

    const campaign = await campaignRepository.findById(businessId, campaignId);
    if (!campaign) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Campaign not found.",
      });
    }

    const now = new Date().toISOString();
    await campaignRepository.update(businessId, campaignId, {
      status: "COMPLETED",
      completedAt: now,
    });

    if (finalMetrics) {
      await campaignRepository.updateAnalytics(
        businessId,
        campaignId,
        finalMetrics,
      );
    }

    const updated = await campaignRepository.getCampaignDetails(
      businessId,
      campaignId,
    );
    if (!updated) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Campaign not found.",
      });
    }
    return updated;
  }

  async getCampaignDetails(
    userId: string,
    businessId: string,
    campaignId: string,
  ): Promise<CampaignWithDetails> {
    await this.checkTenantAccess(userId, businessId);

    const campaign = await campaignRepository.getCampaignDetails(
      businessId,
      campaignId,
    );
    if (!campaign) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Campaign not found.",
      });
    }

    return campaign;
  }

  async listCampaigns(
    userId: string,
    businessId: string,
    filters: CampaignListFilters = {},
  ): Promise<PaginatedResult<Campaign>> {
    await this.checkTenantAccess(userId, businessId);

    return campaignRepository.list(businessId, filters);
  }

  async updateCampaign(
    userId: string,
    businessId: string,
    campaignId: string,
    input: UpdateCampaignInput,
  ): Promise<Campaign> {
    await this.checkAdminOrOwner(userId, businessId);

    const campaign = await campaignRepository.findById(businessId, campaignId);
    if (!campaign) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Campaign not found.",
      });
    }

    const updated = await campaignRepository.update(
      businessId,
      campaignId,
      input,
    );
    if (!updated) {
      throw new AppError({
        code: "INTERNAL_ERROR",
        message: "Failed to update campaign.",
      });
    }

    return updated;
  }

  async deleteCampaign(
    userId: string,
    businessId: string,
    campaignId: string,
  ): Promise<{ success: boolean }> {
    await this.checkAdminOrOwner(userId, businessId);

    const campaign = await campaignRepository.findById(businessId, campaignId);
    if (!campaign) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Campaign not found.",
      });
    }

    if (campaign.status === "RUNNING") {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Cannot delete an actively running campaign.",
      });
    }

    const deleted = await campaignRepository.delete(businessId, campaignId);
    return { success: deleted };
  }
}

export const campaignService = new CampaignService();
