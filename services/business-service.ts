import { AppError } from "@/lib/errors";
import {
  assertRole,
  assertTenantAccess,
  canChangeMemberRole,
} from "@/lib/auth/authorization";
import { businessRepository } from "@/repositories/business-repository";
import { memberRepository } from "@/repositories/member-repository";
import { profileRepository } from "@/repositories/profile-repository";
import { subscriptionRepository } from "@/repositories/subscription-repository";
import { preferencesRepository } from "@/repositories/preferences-repository";
import type {
  Business,
  BusinessContext,
  BusinessMember,
  CustomerPreferences,
  Subscription,
  UserRole,
} from "@/types/auth";
import type {
  CreateBusinessInput,
  UpdateBusinessInput,
  AddMemberInput,
  UpdatePreferencesInput,
} from "@/schemas/business";

export class BusinessService {
  async createBusiness(
    userId: string,
    input: CreateBusinessInput,
  ): Promise<{ business: Business; member: BusinessMember }> {
    const profile = await profileRepository.findById(userId);
    if (!profile) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "User profile not found.",
      });
    }

    const business = await businessRepository.create({
      name: input.name,
    });

    const member = await memberRepository.create({
      businessId: business.id,
      userId,
      role: "OWNER",
    });

    await subscriptionRepository.create({
      businessId: business.id,
      plan: "free",
      status: "active",
    });

    await preferencesRepository.create({
      businessId: business.id,
      currency: "USD",
      timezone: "UTC",
      inactivityThresholdDays: 60,
      recoveryRateTarget: 0.15,
      aiTonePreference: "professional",
    });

    return { business, member };
  }

  async getBusinessContext(
    userId: string,
    businessId: string,
  ): Promise<BusinessContext> {
    const userMemberships = await memberRepository.findByUserId(userId);
    assertTenantAccess(userMemberships, businessId);

    const business = await businessRepository.findById(businessId);
    if (!business) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Business workspace not found.",
      });
    }

    const membership = await memberRepository.findByBusinessAndUser(
      businessId,
      userId,
    );
    if (!membership) {
      throw new AppError({
        code: "FORBIDDEN",
        message: "Access to business workspace denied.",
      });
    }

    let subscription = await subscriptionRepository.findByBusinessId(businessId);
    if (!subscription) {
      subscription = await subscriptionRepository.create({ businessId });
    }

    let preferences = await preferencesRepository.findByBusinessId(businessId);
    if (!preferences) {
      preferences = await preferencesRepository.create({ businessId });
    }

    return {
      business,
      membership,
      subscription,
      preferences,
    };
  }

  async updateBusiness(
    userId: string,
    businessId: string,
    input: UpdateBusinessInput,
  ): Promise<Business> {
    const userMemberships = await memberRepository.findByUserId(userId);
    assertRole(userMemberships, businessId, "ADMIN");

    const updated = await businessRepository.update(businessId, {
      name: input.name,
    });

    if (!updated) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Business workspace not found.",
      });
    }

    return updated;
  }

  async listMembers(userId: string, businessId: string): Promise<BusinessMember[]> {
    const userMemberships = await memberRepository.findByUserId(userId);
    assertTenantAccess(userMemberships, businessId);

    return memberRepository.findByBusinessId(businessId);
  }

  async addMember(
    actorId: string,
    businessId: string,
    input: AddMemberInput,
  ): Promise<BusinessMember> {
    const actorMemberships = await memberRepository.findByUserId(actorId);
    const actorRole = assertRole(actorMemberships, businessId, "ADMIN");

    if (actorRole === "ADMIN" && input.role === "OWNER") {
      throw new AppError({
        code: "FORBIDDEN",
        message: "Only workspace Owners can assign the OWNER role.",
      });
    }

    let targetProfile = await profileRepository.findByEmail(input.email);
    if (!targetProfile) {
      // Provision profile placeholder for invited user
      const placeholderId = crypto.randomUUID();
      targetProfile = await profileRepository.create({
        id: placeholderId,
        email: input.email,
        fullName: null,
      });
    }

    const existingMember = await memberRepository.findByBusinessAndUser(
      businessId,
      targetProfile.id,
    );
    if (existingMember) {
      throw new AppError({
        code: "CONFLICT",
        message: "User is already a member of this workspace.",
      });
    }

    return memberRepository.create({
      businessId,
      userId: targetProfile.id,
      role: input.role,
    });
  }

  async updateMemberRole(
    actorId: string,
    businessId: string,
    targetMemberId: string,
    newRole: UserRole,
  ): Promise<BusinessMember> {
    const actorMemberships = await memberRepository.findByUserId(actorId);
    const actorRole = assertTenantAccess(actorMemberships, businessId);

    const targetMember = await memberRepository.findById(targetMemberId);
    if (!targetMember || targetMember.businessId !== businessId) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Workspace member not found.",
      });
    }

    if (!canChangeMemberRole(actorRole, targetMember.role, newRole)) {
      throw new AppError({
        code: "FORBIDDEN",
        message: `Insufficient permissions to change role from ${targetMember.role} to ${newRole}.`,
      });
    }

    // Safeguard: Ensure at least one OWNER remains
    if (targetMember.role === "OWNER" && newRole !== "OWNER") {
      const ownerCount = await memberRepository.countOwners(businessId);
      if (ownerCount <= 1) {
        throw new AppError({
          code: "CONFLICT",
          message: "Cannot demote the sole workspace Owner. Appoint another Owner first.",
        });
      }
    }

    const updated = await memberRepository.updateRole(targetMemberId, newRole);
    if (!updated) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Failed to update member role.",
      });
    }

    return updated;
  }

  async removeMember(
    actorId: string,
    businessId: string,
    targetMemberId: string,
  ): Promise<void> {
    const actorMemberships = await memberRepository.findByUserId(actorId);
    const actorRole = assertTenantAccess(actorMemberships, businessId);

    const targetMember = await memberRepository.findById(targetMemberId);
    if (!targetMember || targetMember.businessId !== businessId) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Workspace member not found.",
      });
    }

    const isSelfRemoval = targetMember.userId === actorId;

    if (!isSelfRemoval && actorRole !== "OWNER" && actorRole !== "ADMIN") {
      throw new AppError({
        code: "FORBIDDEN",
        message: "Only workspace Owners and Admins can remove team members.",
      });
    }

    if (!isSelfRemoval && actorRole === "ADMIN" && (targetMember.role === "OWNER" || targetMember.role === "ADMIN")) {
      throw new AppError({
        code: "FORBIDDEN",
        message: "Admins cannot remove Owners or other Admins.",
      });
    }

    // Safeguard: Sole OWNER cannot leave/be removed
    if (targetMember.role === "OWNER") {
      const ownerCount = await memberRepository.countOwners(businessId);
      if (ownerCount <= 1) {
        throw new AppError({
          code: "CONFLICT",
          message: "Cannot remove the sole workspace Owner. Transfer ownership first.",
        });
      }
    }

    await memberRepository.delete(targetMemberId);
  }

  async updatePreferences(
    userId: string,
    businessId: string,
    input: UpdatePreferencesInput,
  ): Promise<CustomerPreferences> {
    const userMemberships = await memberRepository.findByUserId(userId);
    assertRole(userMemberships, businessId, "ADMIN");

    const updated = await preferencesRepository.update(businessId, input);
    if (!updated) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Customer recovery preferences not found.",
      });
    }

    return updated;
  }

  async getSubscription(
    userId: string,
    businessId: string,
  ): Promise<Subscription> {
    const userMemberships = await memberRepository.findByUserId(userId);
    assertTenantAccess(userMemberships, businessId);

    let subscription = await subscriptionRepository.findByBusinessId(businessId);
    if (!subscription) {
      subscription = await subscriptionRepository.create({ businessId });
    }

    return subscription;
  }
}

export const businessService = new BusinessService();
