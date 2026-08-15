import { AppError } from "@/lib/errors";
import type { UserRole } from "@/types/auth";

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  OWNER: 3,
  ADMIN: 2,
  MEMBER: 1,
};

/**
 * Checks if the current role satisfies the required minimum role level.
 */
export function hasRole(currentRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[currentRole] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * Checks if a user role can manage team members (invite, list).
 */
export function canManageMembers(role: UserRole): boolean {
  return hasRole(role, "ADMIN");
}

/**
 * Checks if a user role can manage billing / subscriptions.
 */
export function canManageBilling(role: UserRole): boolean {
  return role === "OWNER";
}

/**
 * Checks if a user role can modify business recovery preferences.
 */
export function canManageSettings(role: UserRole): boolean {
  return hasRole(role, "ADMIN");
}

/**
 * Checks if a user role can delete the workspace.
 */
export function canDeleteBusiness(role: UserRole): boolean {
  return role === "OWNER";
}

/**
 * Role modification authority checks:
 * - OWNER can assign any role.
 * - ADMIN cannot promote anyone to OWNER, nor modify existing OWNERs or ADMINs.
 * - MEMBER cannot modify any roles.
 */
export function canChangeMemberRole(
  actorRole: UserRole,
  targetCurrentRole: UserRole,
  newRole: UserRole,
): boolean {
  if (actorRole === "OWNER") {
    return true;
  }

  if (actorRole === "ADMIN") {
    if (targetCurrentRole === "OWNER" || targetCurrentRole === "ADMIN") {
      return false;
    }
    if (newRole === "OWNER") {
      return false;
    }
    return true;
  }

  return false;
}

export interface UserMembershipLike {
  businessId: string;
  role: UserRole;
}

/**
 * Asserts that the authenticated user belongs to the target business.
 * Throws FORBIDDEN AppError if tenant access is denied.
 */
export function assertTenantAccess(
  memberships: UserMembershipLike[] | undefined,
  targetBusinessId: string,
): UserRole {
  if (!memberships || memberships.length === 0) {
    throw new AppError({
      code: "FORBIDDEN",
      message: "You do not have access to any business workspace.",
    });
  }

  const membership = memberships.find((m) => m.businessId === targetBusinessId);

  if (!membership) {
    throw new AppError({
      code: "FORBIDDEN",
      message: "You do not have access to this business workspace.",
      details: { requestedBusinessId: targetBusinessId },
    });
  }

  return membership.role;
}

/**
 * Asserts that the authenticated user has at least the required role in the target business.
 * Throws FORBIDDEN AppError if permission is insufficient.
 */
export function assertRole(
  memberships: UserMembershipLike[] | undefined,
  targetBusinessId: string,
  requiredRole: UserRole,
): UserRole {
  const currentRole = assertTenantAccess(memberships, targetBusinessId);

  if (!hasRole(currentRole, requiredRole)) {
    throw new AppError({
      code: "FORBIDDEN",
      message: `Action requires ${requiredRole} permission. Current role: ${currentRole}`,
      details: { currentRole, requiredRole, businessId: targetBusinessId },
    });
  }

  return currentRole;
}

/**
 * Enforces strict tenant isolation between request context and URL/payload business IDs.
 */
export function enforceTenantIsolation(
  activeBusinessId: string,
  targetBusinessId: string,
): void {
  if (activeBusinessId !== targetBusinessId) {
    throw new AppError({
      code: "FORBIDDEN",
      message: "Cross-tenant request blocked. Target business does not match active workspace.",
      details: { activeBusinessId, targetBusinessId },
    });
  }
}
