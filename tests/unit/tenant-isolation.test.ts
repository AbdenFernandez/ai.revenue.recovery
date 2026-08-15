import { beforeEach, describe, expect, it } from "vitest";
import { authService } from "@/services/auth-service";
import { businessService } from "@/services/business-service";
import { memberRepository } from "@/repositories/member-repository";
import { businessRepository } from "@/repositories/business-repository";
import { profileRepository } from "@/repositories/profile-repository";
import { preferencesRepository } from "@/repositories/preferences-repository";
import { subscriptionRepository } from "@/repositories/subscription-repository";
import { requireAuth } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";

describe("Tenant Isolation and Security Test Suite", () => {
  beforeEach(() => {
    profileRepository.clearMocks();
    businessRepository.clearMocks();
    memberRepository.clearMocks();
    subscriptionRepository.clearMocks();
    preferencesRepository.clearMocks();
    authService.clearMocks();
  });


  // TEST CASE 1: User A cannot access Business B
  it("Test Case 1: User A cannot access Business B", async () => {
    // 1. Create User A with Business A
    const sessionA = await authService.register({
      email: "usera@alpha.com",
      password: "Password123",
      fullName: "User A",
      businessName: "Business Alpha",
    });
    const businessAId = sessionA.activeBusinessId!;

    // 2. Create User B with Business B
    const sessionB = await authService.register({
      email: "userb@beta.com",
      password: "Password123",
      fullName: "User B",
      businessName: "Business Beta",
    });
    const businessBId = sessionB.activeBusinessId!;

    // User A can access Business A context
    const contextA = await businessService.getBusinessContext(
      sessionA.user.id,
      businessAId,
    );
    expect(contextA.business.id).toBe(businessAId);

    // User A trying to access Business B is rejected with FORBIDDEN (403)
    await expect(
      businessService.getBusinessContext(sessionA.user.id, businessBId),
    ).rejects.toThrowError(AppError);

    try {
      await businessService.getBusinessContext(sessionA.user.id, businessBId);
    } catch (err) {
      expect((err as AppError).code).toBe("FORBIDDEN");
      expect((err as AppError).statusCode).toBe(403);
    }
  });

  // TEST CASE 2: Member cannot perform owner-only action
  it("Test Case 2: Member cannot perform owner-only or admin-only action", async () => {
    // 1. Owner creates business
    const ownerSession = await authService.register({
      email: "owner@company.com",
      password: "Password123",
      fullName: "Owner User",
      businessName: "Main Workspace",
    });
    const businessId = ownerSession.activeBusinessId!;

    // 2. Add a standard MEMBER
    const member = await businessService.addMember(
      ownerSession.user.id,
      businessId,
      {
        email: "member@company.com",
        role: "MEMBER",
      },
    );

    // Member attempts to update business name -> Rejected
    await expect(
      businessService.updateBusiness(member.userId, businessId, {
        name: "Hacked Business Name",
      }),
    ).rejects.toThrowError(AppError);

    // Member attempts to update customer recovery preferences -> Rejected
    await expect(
      businessService.updatePreferences(member.userId, businessId, {
        inactivityThresholdDays: 14,
      }),
    ).rejects.toThrowError(AppError);

    // Member attempts to promote another member to ADMIN -> Rejected
    await expect(
      businessService.updateMemberRole(
        member.userId,
        businessId,
        member.id,
        "ADMIN",
      ),
    ).rejects.toThrowError(AppError);
  });

  // TEST CASE 3: Unauthenticated user cannot access protected resources
  it("Test Case 3: Unauthenticated user cannot access protected resources", async () => {
    // Empty request without cookies or headers
    const emptyRequest = new Request("http://localhost:3000/api/businesses", {
      method: "GET",
    });

    await expect(requireAuth(emptyRequest)).rejects.toThrowError(AppError);

    try {
      await requireAuth(emptyRequest);
    } catch (err) {
      expect((err as AppError).code).toBe("UNAUTHORIZED");
      expect((err as AppError).statusCode).toBe(401);
    }
  });

  // TEST CASE 4: API rejects unauthorized business_id access
  it("Test Case 4: API rejects unauthorized business_id manipulation", async () => {
    const sessionA = await authService.register({
      email: "tenant1@test.com",
      password: "Password123",
      fullName: "Tenant 1",
      businessName: "Tenant One Workspace",
    });

    const sessionB = await authService.register({
      email: "tenant2@test.com",
      password: "Password123",
      fullName: "Tenant 2",
      businessName: "Tenant Two Workspace",
    });

    // Attempting to list members of Tenant B using Tenant A's user ID
    await expect(
      businessService.listMembers(
        sessionA.user.id,
        sessionB.activeBusinessId!,
      ),
    ).rejects.toThrowError(AppError);

    // Attempting to modify preferences of Tenant B using Tenant A's user ID
    await expect(
      businessService.updatePreferences(
        sessionA.user.id,
        sessionB.activeBusinessId!,
        { currency: "EUR" },
      ),
    ).rejects.toThrowError(AppError);
  });

  // TEST CASE 5: RLS and repository queries block cross-tenant access
  it("Test Case 5: Repository queries strictly isolate data by tenant ID", async () => {
    const sessionAlpha = await authService.register({
      email: "alpha@corp.com",
      password: "Password123",
      fullName: "Alpha Owner",
      businessName: "Alpha Corp",
    });

    const sessionBeta = await authService.register({
      email: "beta@corp.com",
      password: "Password123",
      fullName: "Beta Owner",
      businessName: "Beta Corp",
    });

    // Verify members of Alpha Corp only include Alpha members
    const alphaMembers = await memberRepository.findByBusinessId(
      sessionAlpha.activeBusinessId!,
    );
    expect(alphaMembers.length).toBe(1);
    expect(alphaMembers[0]?.userId).toBe(sessionAlpha.user.id);
    expect(
      alphaMembers.some((m) => m.userId === sessionBeta.user.id),
    ).toBe(false);

    // Verify customer preferences are isolated
    const alphaPrefs = await preferencesRepository.findByBusinessId(
      sessionAlpha.activeBusinessId!,
    );
    const betaPrefs = await preferencesRepository.findByBusinessId(
      sessionBeta.activeBusinessId!,
    );

    expect(alphaPrefs?.businessId).toBe(sessionAlpha.activeBusinessId);
    expect(betaPrefs?.businessId).toBe(sessionBeta.activeBusinessId);
    expect(alphaPrefs?.id).not.toBe(betaPrefs?.id);
  });
});
