import { beforeEach, describe, expect, it } from "vitest";
import { campaignRepository } from "@/repositories/campaign-repository";

describe("CampaignRepository Data Access Layer", () => {
  const businessA = "biz-alpha";
  const businessB = "biz-beta";

  beforeEach(() => {
    campaignRepository.clearMocks();
  });

  it("creates, retrieves, and updates campaign with initial blank analytics", async () => {
    const created = await campaignRepository.create(businessA, {
      name: "Q3 VIP Recovery",
      description: "Appreciation drive",
      targetSegment: "VIP",
      channel: "email",
      audienceCount: 25,
      estimatedOpportunity: 8500,
    });

    expect(created.id).toBeDefined();
    expect(created.businessId).toBe(businessA);
    expect(created.status).toBe("DRAFT");
    expect(created.audienceCount).toBe(25);
    expect(created.estimatedOpportunity).toBe(8500);

    // Retrieve
    const found = await campaignRepository.findById(businessA, created.id);
    expect(found).not.toBeNull();
    expect(found?.name).toBe("Q3 VIP Recovery");

    // Update
    const updated = await campaignRepository.update(businessA, created.id, {
      name: "Q3 VIP Loyalty Blitz",
      status: "READY",
    });
    expect(updated?.name).toBe("Q3 VIP Loyalty Blitz");
    expect(updated?.status).toBe("READY");

    // Check Analytics
    const analytics = await campaignRepository.getAnalytics(
      businessA,
      created.id,
    );
    expect(analytics.targeted).toBe(25);
    expect(analytics.sent).toBe(0);
  });

  it("manages campaign variants and marks single approved variant", async () => {
    const campaign = await campaignRepository.create(businessA, {
      name: "At-Risk Outreach",
      targetSegment: "At Risk",
      channel: "email",
      audienceCount: 15,
      estimatedOpportunity: 3200,
    });

    const variants = await campaignRepository.addVariants(
      businessA,
      campaign.id,
      [
        {
          variantLabel: "Variant A - Direct",
          subject: "Special Offer",
          messageBody: "Direct copy here",
          callToAction: "Shop Now",
          tone: "professional",
          isApproved: false,
        },
        {
          variantLabel: "Variant B - Warm",
          subject: "We Miss You",
          messageBody: "Warm copy here",
          callToAction: "Reclaim Perk",
          tone: "friendly",
          isApproved: false,
        },
      ],
    );

    expect(variants.length).toBe(2);
    expect(variants[0]?.isApproved).toBe(false);

    // Approve Variant B
    const approved = await campaignRepository.approveVariant(
      businessA,
      campaign.id,
      variants[1]!.id,
    );
    expect(approved?.id).toBe(variants[1]!.id);
    expect(approved?.isApproved).toBe(true);

    // Verify Variant A remains unapproved
    const allVariants = await campaignRepository.getVariants(
      businessA,
      campaign.id,
    );
    const varA = allVariants.find((v) => v.id === variants[0]!.id);
    const varB = allVariants.find((v) => v.id === variants[1]!.id);
    expect(varA?.isApproved).toBe(false);
    expect(varB?.isApproved).toBe(true);

  });

  it("updates analytics and calculates attribution metrics", async () => {
    const campaign = await campaignRepository.create(businessA, {
      name: "Dormant Win-Back",
      targetSegment: "Dormant",
      channel: "email",
      audienceCount: 50,
      estimatedOpportunity: 12000,
    });

    const updated = await campaignRepository.updateAnalytics(
      businessA,
      campaign.id,
      {
        sent: 50,
        delivered: 48,
        opened: 22,
        replied: 9,
        converted: 6,
        revenueAttributed: 3600,
      },
    );

    expect(updated.sent).toBe(50);
    expect(updated.converted).toBe(6);
    expect(updated.revenueAttributed).toBe(3600);
  });

  it("strictly isolates campaigns across different tenants", async () => {
    const campA = await campaignRepository.create(businessA, {
      name: "Alpha Exclusive",
      targetSegment: "VIP",
      channel: "email",
      audienceCount: 10,
      estimatedOpportunity: 5000,
    });

    // Business B cannot find or list Business A campaigns
    const foundByB = await campaignRepository.findById(businessB, campA.id);
    expect(foundByB).toBeNull();

    const listB = await campaignRepository.list(businessB);
    expect(listB.items.length).toBe(0);
  });
});
