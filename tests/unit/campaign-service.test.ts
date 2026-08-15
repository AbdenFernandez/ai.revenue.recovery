import { beforeEach, describe, expect, it } from "vitest";
import { campaignService } from "@/services/campaign-service";
import { campaignRepository } from "@/repositories/campaign-repository";
import { customerRepository } from "@/repositories/customer-repository";
import { MemberRepository } from "@/repositories/member-repository";
import { BusinessRepository } from "@/repositories/business-repository";
import { PreferencesRepository } from "@/repositories/preferences-repository";
import { AppError } from "@/lib/errors";

describe("CampaignService Domain Orchestrator & Approval Security", () => {
  const userOwnerA = "user-owner-a";
  const userOwnerB = "user-owner-b";

  const businessA = "biz-alpha";
  const businessB = "biz-beta";

  beforeEach(async () => {
    campaignRepository.clearMocks();
    customerRepository.clearMocks();
    MemberRepository.clearMocks();
    BusinessRepository.clearMocks();
    PreferencesRepository.clearMocks();

    // Setup Business A
    BusinessRepository.setMock(businessA, {
      id: businessA,
      name: "Alpha Corp",
      slug: "alpha",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    MemberRepository.setMock("m-1", {
      id: "m-1",
      businessId: businessA,
      userId: userOwnerA,
      role: "OWNER",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    PreferencesRepository.setMock(businessA, {
      id: "pref-a",
      businessId: businessA,
      inactivityThresholdDays: 60,
      recoveryRateTarget: 0.2,
      aiTonePreference: "professional",
      currency: "USD",
      timezone: "UTC",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Setup Business B
    BusinessRepository.setMock(businessB, {
      id: businessB,
      name: "Beta Corp",
      slug: "beta",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    MemberRepository.setMock("m-2", {
      id: "m-2",
      businessId: businessB,
      userId: userOwnerB,
      role: "OWNER",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Seed customers in Business A
    // 1. VIP Customer
    await customerRepository.create(businessA, {
      name: "VIP Alice",
      email: "alice@vip.com",
      company: "Alice Corp",
      totalPurchaseAmount: 6000,
      purchaseCount: 10,
      lastPurchaseDate: new Date("2026-08-01T00:00:00Z").toISOString(),
      consentStatus: true,
      optOutStatus: false,
    });

    // 2. Win-Back Customer (Inactive 100 days)
    await customerRepository.create(businessA, {
      name: "Win-Back Bob",
      email: "bob@winback.com",
      company: "Bob Enterprises",
      totalPurchaseAmount: 3200,
      purchaseCount: 5,
      lastPurchaseDate: new Date("2026-05-01T00:00:00Z").toISOString(),
      consentStatus: true,
      optOutStatus: false,
    });

    // 3. Opted-out customer (should be excluded from audience)
    await customerRepository.create(businessA, {
      name: "Opted Out Charlie",
      email: "charlie@optout.com",
      totalPurchaseAmount: 4000,
      purchaseCount: 6,
      lastPurchaseDate: new Date("2026-05-01T00:00:00Z").toISOString(),
      consentStatus: false,
      optOutStatus: true,
    });
  });

  it("calculates real-time audience size and revenue potential excluding opted-out accounts", async () => {
    const audience = await campaignService.estimateAudience(
      userOwnerA,
      businessA,
      "Win Back",
    );

    expect(audience.segment).toBe("Win Back");
    expect(audience.audienceCount).toBe(1); // Only Bob, Charlie is opted-out
    expect(audience.totalEstimatedRevenue).toBeGreaterThan(0);
    expect(audience.currency).toBe("USD");
  });

  it("synthesizes AI campaign blueprint with multi-variants in DRAFT status", async () => {
    const campaign = await campaignService.createCampaignWithAI(
      userOwnerA,
      businessA,
      {
        name: "Q3 VIP Retention Blitz",
        targetSegment: "VIP",
        channel: "email",
        maxDiscountPercent: 20,
      },
    );

    expect(campaign.name).toBe("Q3 VIP Retention Blitz");
    expect(campaign.status).toBe("DRAFT");
    expect(campaign.targetSegment).toBe("VIP");
    expect(campaign.strategyRationale).toBeDefined();

    // Must generate 2 distinct message variants
    expect(campaign.variants.length).toBe(2);
    expect(campaign.variants[0]?.isApproved).toBe(false);
    expect(campaign.variants[1]?.isApproved).toBe(false);
  });

  it("enforces explicit business approval workflow transitioning DRAFT to READY", async () => {
    const created = await campaignService.createCampaignWithAI(
      userOwnerA,
      businessA,
      {
        name: "Win-Back Activation",
        targetSegment: "Win Back",
        channel: "email",
      },
    );

    const variantToApprove = created.variants[1]!.id;

    const approved = await campaignService.approveCampaign(
      userOwnerA,
      businessA,
      created.id,
      variantToApprove,
    );

    expect(approved.status).toBe("READY");
    const activeVar = approved.variants.find((v) => v.id === variantToApprove);
    expect(activeVar?.isApproved).toBe(true);
  });

  it("enforces Zero-Auto-Send Security Policy (cannot launch unapproved DRAFT campaign)", async () => {
    const created = await campaignService.createCampaignWithAI(
      userOwnerA,
      businessA,
      {
        name: "Unapproved Campaign",
        targetSegment: "VIP",
        channel: "email",
      },
    );

    // Attempting to launch while still in DRAFT status must throw an AppError
    await expect(
      campaignService.launchCampaign(userOwnerA, businessA, created.id),
    ).rejects.toThrowError(AppError);
  });

  it("executes full lifecycle: READY -> RUNNING -> PAUSED -> RESUMED -> COMPLETED", async () => {
    // 1. Create
    const created = await campaignService.createCampaignWithAI(
      userOwnerA,
      businessA,
      {
        name: "Lifecycle Test Campaign",
        targetSegment: "Win Back",
        channel: "email",
      },
    );

    // 2. Approve
    await campaignService.approveCampaign(
      userOwnerA,
      businessA,
      created.id,
      created.variants[0]!.id,
    );

    // 3. Launch -> RUNNING
    const launched = await campaignService.launchCampaign(
      userOwnerA,
      businessA,
      created.id,
    );
    expect(launched.status).toBe("RUNNING");
    expect(launched.analytics.sent).toBe(launched.audienceCount);

    // 4. Pause -> PAUSED
    const paused = await campaignService.pauseCampaign(
      userOwnerA,
      businessA,
      created.id,
    );
    expect(paused.status).toBe("PAUSED");

    // 5. Resume -> RUNNING
    const resumed = await campaignService.resumeCampaign(
      userOwnerA,
      businessA,
      created.id,
    );
    expect(resumed.status).toBe("RUNNING");

    // 6. Complete -> COMPLETED with attribution
    const completed = await campaignService.completeCampaign(
      userOwnerA,
      businessA,
      created.id,
      {
        opened: 1,
        replied: 1,
        converted: 1,
        revenueAttributed: 800,
      },
    );
    expect(completed.status).toBe("COMPLETED");
    expect(completed.completedAt).not.toBeNull();
    expect(completed.analytics.converted).toBe(1);
    expect(completed.analytics.revenueAttributed).toBe(800);
  });

  it("strictly prohibits unauthorized tenant from accessing or launching campaigns", async () => {
    const created = await campaignService.createCampaignWithAI(
      userOwnerA,
      businessA,
      {
        name: "Confidential Alpha Campaign",
        targetSegment: "VIP",
        channel: "email",
      },
    );

    // User B attempting to view details in Business A must throw FORBIDDEN
    await expect(
      campaignService.getCampaignDetails(userOwnerB, businessA, created.id),
    ).rejects.toThrowError(AppError);

    // User B attempting to approve in Business A must throw FORBIDDEN
    await expect(
      campaignService.approveCampaign(
        userOwnerB,
        businessA,
        created.id,
        created.variants[0]!.id,
      ),
    ).rejects.toThrowError(AppError);
  });

  it("handles 0 matching audience gracefully without division by zero errors", async () => {
    // "Lost" segment has 0 matching customers in our seed
    const audience = await campaignService.estimateAudience(
      userOwnerA,
      businessA,
      "Lost",
    );

    expect(audience.segment).toBe("Lost");
    expect(audience.audienceCount).toBe(0);
    expect(audience.totalEstimatedRevenue).toBe(0);
    expect(audience.averageConfidence).toBeGreaterThan(0);
  });

  it("permits deleting draft campaigns but strictly blocks deleting actively running campaigns", async () => {
    // 1. Delete DRAFT campaign -> succeeds
    const draft = await campaignService.createCampaignWithAI(
      userOwnerA,
      businessA,
      {
        name: "Temporary Draft",
        targetSegment: "VIP",
        channel: "email",
      },
    );
    const delResult = await campaignService.deleteCampaign(
      userOwnerA,
      businessA,
      draft.id,
    );
    expect(delResult.success).toBe(true);

    // 2. Running campaign deletion -> blocked
    const readyCamp = await campaignService.createCampaignWithAI(
      userOwnerA,
      businessA,
      {
        name: "Running Campaign",
        targetSegment: "VIP",
        channel: "email",
      },
    );
    await campaignService.approveCampaign(
      userOwnerA,
      businessA,
      readyCamp.id,
      readyCamp.variants[0]!.id,
    );
    await campaignService.launchCampaign(userOwnerA, businessA, readyCamp.id);

    await expect(
      campaignService.deleteCampaign(userOwnerA, businessA, readyCamp.id),
    ).rejects.toThrowError(AppError);
  });
});

