import type {
  Campaign,
  CampaignAnalytics,
  CampaignListFilters,
  CampaignVariant,
  CampaignWithDetails,
} from "@/types/campaign";
import type { PaginatedResult } from "@/types";

export class CampaignRepository {
  private static mockCampaigns: Map<string, Campaign> = new Map();
  private static mockVariants: Map<string, CampaignVariant> = new Map();
  private static mockAnalytics: Map<string, CampaignAnalytics> = new Map();

  static setMockCampaign(id: string, campaign: Campaign) {
    this.mockCampaigns.set(id, campaign);
  }

  static setMockVariant(id: string, variant: CampaignVariant) {
    this.mockVariants.set(id, variant);
  }

  static setMockAnalytics(campaignId: string, analytics: CampaignAnalytics) {
    this.mockAnalytics.set(campaignId, analytics);
  }

  static clearMocks() {
    this.mockCampaigns.clear();
    this.mockVariants.clear();
    this.mockAnalytics.clear();
  }

  clearMocks() {
    CampaignRepository.clearMocks();
  }

  async create(
    businessId: string,
    data: {
      name: string;
      description?: string | null;
      targetSegment: Campaign["targetSegment"];
      channel: Campaign["channel"];
      audienceCount: number;
      estimatedOpportunity: number;
      strategyRationale?: string | null;
      scheduledAt?: string | null;
    },
  ): Promise<Campaign> {
    const id = `cmp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const newCampaign: Campaign = {
      id,
      businessId,
      name: data.name,
      description: data.description ?? null,
      targetSegment: data.targetSegment,
      channel: data.channel,
      status: "DRAFT",
      audienceCount: data.audienceCount,
      estimatedOpportunity: data.estimatedOpportunity,
      strategyRationale: data.strategyRationale ?? null,
      scheduledAt: data.scheduledAt ?? null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    CampaignRepository.mockCampaigns.set(id, newCampaign);

    // Initialize blank analytics
    const initialAnalytics: CampaignAnalytics = {
      campaignId: id,
      businessId,
      targeted: data.audienceCount,
      prepared: data.audienceCount,
      sent: 0,
      delivered: 0,
      opened: 0,
      replied: 0,
      converted: 0,
      revenueAttributed: 0,
      updatedAt: now,
    };
    CampaignRepository.mockAnalytics.set(id, initialAnalytics);

    return { ...newCampaign };
  }

  async findById(
    businessId: string,
    campaignId: string,
  ): Promise<Campaign | null> {
    const campaign = CampaignRepository.mockCampaigns.get(campaignId);
    if (!campaign || campaign.businessId !== businessId) {
      return null;
    }
    return { ...campaign };
  }

  async list(
    businessId: string,
    filters: CampaignListFilters = {},
  ): Promise<PaginatedResult<Campaign>> {
    const page = filters.page || 1;
    const pageSize = filters.limit || 10;

    let list = Array.from(CampaignRepository.mockCampaigns.values()).filter(
      (c) => c.businessId === businessId,
    );

    if (filters.status) {
      list = list.filter((c) => c.status === filters.status);
    }
    if (filters.targetSegment) {
      list = list.filter((c) => c.targetSegment === filters.targetSegment);
    }
    if (filters.channel) {
      list = list.filter((c) => c.channel === filters.channel);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.description && c.description.toLowerCase().includes(q)),
      );
    }

    // Sort descending by createdAt
    list.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    const total = list.length;
    const startIndex = (page - 1) * pageSize;
    const paginated = list.slice(startIndex, startIndex + pageSize);

    return {
      items: paginated.map((c) => ({ ...c })),
      total,
      page,
      pageSize,
    };
  }

  async update(
    businessId: string,
    campaignId: string,
    data: Partial<
      Pick<
        Campaign,
        | "name"
        | "description"
        | "status"
        | "scheduledAt"
        | "completedAt"
        | "audienceCount"
        | "estimatedOpportunity"
        | "strategyRationale"
      >
    >,
  ): Promise<Campaign | null> {
    const existing = await this.findById(businessId, campaignId);
    if (!existing) return null;

    const updated: Campaign = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    };

    CampaignRepository.mockCampaigns.set(campaignId, updated);
    return { ...updated };
  }

  async delete(businessId: string, campaignId: string): Promise<boolean> {
    const existing = await this.findById(businessId, campaignId);
    if (!existing) return false;

    CampaignRepository.mockCampaigns.delete(campaignId);
    CampaignRepository.mockAnalytics.delete(campaignId);

    // Delete associated variants
    for (const [id, variant] of CampaignRepository.mockVariants.entries()) {
      if (variant.campaignId === campaignId) {
        CampaignRepository.mockVariants.delete(id);
      }
    }

    return true;
  }

  // Variant operations
  async addVariants(
    businessId: string,
    campaignId: string,
    variants: Array<
      Omit<CampaignVariant, "id" | "campaignId" | "businessId" | "createdAt">
    >,
  ): Promise<CampaignVariant[]> {
    const now = new Date().toISOString();
    const created: CampaignVariant[] = [];

    for (const v of variants) {
      const id = `var_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const variant: CampaignVariant = {
        id,
        campaignId,
        businessId,
        variantLabel: v.variantLabel,
        subject: v.subject ?? null,
        messageBody: v.messageBody,
        callToAction: v.callToAction,
        tone: v.tone,
        isApproved: v.isApproved ?? false,
        createdAt: now,
      };

      CampaignRepository.mockVariants.set(id, variant);
      created.push({ ...variant });
    }

    return created;
  }

  async getVariants(
    businessId: string,
    campaignId: string,
  ): Promise<CampaignVariant[]> {
    return Array.from(CampaignRepository.mockVariants.values())
      .filter((v) => v.businessId === businessId && v.campaignId === campaignId)
      .map((v) => ({ ...v }));
  }

  async approveVariant(
    businessId: string,
    campaignId: string,
    variantId: string,
  ): Promise<CampaignVariant | null> {
    const variants = await this.getVariants(businessId, campaignId);
    let targetVariant: CampaignVariant | null = null;

    for (const v of variants) {
      if (v.id === variantId) {
        v.isApproved = true;
        targetVariant = { ...v };
      } else {
        v.isApproved = false; // single active approved variant
      }
      CampaignRepository.mockVariants.set(v.id, { ...v });
    }

    return targetVariant;
  }

  // Analytics operations
  async getAnalytics(
    businessId: string,
    campaignId: string,
  ): Promise<CampaignAnalytics> {
    const existing = CampaignRepository.mockAnalytics.get(campaignId);
    if (existing && existing.businessId === businessId) {
      return { ...existing };
    }

    const campaign = await this.findById(businessId, campaignId);
    const initial: CampaignAnalytics = {
      campaignId,
      businessId,
      targeted: campaign?.audienceCount || 0,
      prepared: campaign?.audienceCount || 0,
      sent: 0,
      delivered: 0,
      opened: 0,
      replied: 0,
      converted: 0,
      revenueAttributed: 0,
      updatedAt: new Date().toISOString(),
    };

    CampaignRepository.mockAnalytics.set(campaignId, initial);
    return { ...initial };
  }

  async updateAnalytics(
    businessId: string,
    campaignId: string,
    data: Partial<
      Omit<CampaignAnalytics, "campaignId" | "businessId" | "updatedAt">
    >,
  ): Promise<CampaignAnalytics> {
    const current = await this.getAnalytics(businessId, campaignId);
    const updated: CampaignAnalytics = {
      ...current,
      ...data,
      updatedAt: new Date().toISOString(),
    };

    CampaignRepository.mockAnalytics.set(campaignId, updated);
    return { ...updated };
  }

  async getCampaignDetails(
    businessId: string,
    campaignId: string,
  ): Promise<CampaignWithDetails | null> {
    const campaign = await this.findById(businessId, campaignId);
    if (!campaign) return null;

    const variants = await this.getVariants(businessId, campaignId);
    const analytics = await this.getAnalytics(businessId, campaignId);

    return {
      ...campaign,
      variants,
      analytics,
    };
  }
}

export const campaignRepository = new CampaignRepository();
