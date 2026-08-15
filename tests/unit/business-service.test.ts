import { beforeEach, describe, expect, it } from "vitest";
import { authService } from "@/services/auth-service";

import { businessService } from "@/services/business-service";
import { memberRepository } from "@/repositories/member-repository";
import { businessRepository } from "@/repositories/business-repository";
import { profileRepository } from "@/repositories/profile-repository";
import { preferencesRepository } from "@/repositories/preferences-repository";
import { subscriptionRepository } from "@/repositories/subscription-repository";
import { AppError } from "@/lib/errors";

describe("BusinessService Unit Tests", () => {
  beforeEach(() => {
    profileRepository.clearMocks();
    businessRepository.clearMocks();
    memberRepository.clearMocks();
    subscriptionRepository.clearMocks();
    preferencesRepository.clearMocks();
    authService.clearMocks();
  });


  it("creates a new workspace and provisions owner, subscription, and recovery preferences", async () => {
    const session = await authService.register({
      email: "owner@workspace.com",
      password: "Password123",
      fullName: "Owner One",
      businessName: "Workspace 1",
    });

    const { business, member } = await businessService.createBusiness(
      session.user.id,
      {
        name: "Second Workspace",
      },
    );

    expect(business.name).toBe("Second Workspace");
    expect(member.role).toBe("OWNER");
    expect(member.businessId).toBe(business.id);

    const context = await businessService.getBusinessContext(
      session.user.id,
      business.id,
    );
    expect(context.subscription.plan).toBe("free");
    expect(context.preferences.currency).toBe("USD");
    expect(context.preferences.inactivityThresholdDays).toBe(60);
  });

  it("manages team members and prevents removing or demoting the sole OWNER", async () => {
    const session = await authService.register({
      email: "founder@team.com",
      password: "Password123",
      fullName: "Founder",
      businessName: "Team Workspace",
    });
    const businessId = session.activeBusinessId!;

    // 1. Owner invites an Admin
    const adminMember = await businessService.addMember(
      session.user.id,
      businessId,
      {
        email: "admin@team.com",
        role: "ADMIN",
      },
    );
    expect(adminMember.role).toBe("ADMIN");

    // 2. Owner invites a Member
    const standardMember = await businessService.addMember(
      session.user.id,
      businessId,
      {
        email: "member@team.com",
        role: "MEMBER",
      },
    );
    expect(standardMember.role).toBe("MEMBER");

    // 3. Admin attempts to promote standard member to OWNER -> Forbidden
    await expect(
      businessService.updateMemberRole(
        adminMember.userId,
        businessId,
        standardMember.id,
        "OWNER",
      ),
    ).rejects.toThrowError(AppError);

    // 4. Owner attempts to demote self while being the only owner -> Conflict
    const ownerMember = (await memberRepository.findByBusinessId(businessId)).find(
      (m) => m.role === "OWNER",
    )!;

    await expect(
      businessService.updateMemberRole(
        session.user.id,
        businessId,
        ownerMember.id,
        "MEMBER",
      ),
    ).rejects.toThrowError(AppError);

    // 5. Owner promotes Admin to OWNER -> Now 2 owners exist
    await businessService.updateMemberRole(
      session.user.id,
      businessId,
      adminMember.id,
      "OWNER",
    );

    // 6. Now original Owner CAN step down to ADMIN safely
    const steppedDown = await businessService.updateMemberRole(
      session.user.id,
      businessId,
      ownerMember.id,
      "ADMIN",
    );
    expect(steppedDown.role).toBe("ADMIN");
  });

  it("updates customer recovery preferences with validation", async () => {
    const session = await authService.register({
      email: "prefs@team.com",
      password: "Password123",
      fullName: "Prefs User",
      businessName: "Prefs Workspace",
    });
    const businessId = session.activeBusinessId!;

    const updated = await businessService.updatePreferences(
      session.user.id,
      businessId,
      {
        currency: "EUR",
        inactivityThresholdDays: 45,
        recoveryRateTarget: 0.25,
        aiTonePreference: "empathetic",
      },
    );

    expect(updated.currency).toBe("EUR");
    expect(updated.inactivityThresholdDays).toBe(45);
    expect(updated.recoveryRateTarget).toBe(0.25);
    expect(updated.aiTonePreference).toBe("empathetic");
  });
});
