import { describe, expect, it } from "vitest";
import {
  hasRole,
  canManageMembers,
  canManageBilling,
  canManageSettings,
  canDeleteBusiness,
  canChangeMemberRole,
  assertTenantAccess,
  assertRole,
  enforceTenantIsolation,
} from "@/lib/auth/authorization";
import { AppError } from "@/lib/errors";

describe("RBAC Authorization Rules", () => {
  it("evaluates role hierarchy correctly", () => {
    expect(hasRole("OWNER", "OWNER")).toBe(true);
    expect(hasRole("OWNER", "ADMIN")).toBe(true);
    expect(hasRole("OWNER", "MEMBER")).toBe(true);

    expect(hasRole("ADMIN", "OWNER")).toBe(false);
    expect(hasRole("ADMIN", "ADMIN")).toBe(true);
    expect(hasRole("ADMIN", "MEMBER")).toBe(true);

    expect(hasRole("MEMBER", "OWNER")).toBe(false);
    expect(hasRole("MEMBER", "ADMIN")).toBe(false);
    expect(hasRole("MEMBER", "MEMBER")).toBe(true);
  });

  it("checks capability permissions", () => {
    // Billing & Delete: OWNER only
    expect(canManageBilling("OWNER")).toBe(true);
    expect(canManageBilling("ADMIN")).toBe(false);
    expect(canManageBilling("MEMBER")).toBe(false);

    expect(canDeleteBusiness("OWNER")).toBe(true);
    expect(canDeleteBusiness("ADMIN")).toBe(false);
    expect(canDeleteBusiness("MEMBER")).toBe(false);

    // Members & Settings: ADMIN and OWNER
    expect(canManageMembers("OWNER")).toBe(true);
    expect(canManageMembers("ADMIN")).toBe(true);
    expect(canManageMembers("MEMBER")).toBe(false);

    expect(canManageSettings("OWNER")).toBe(true);
    expect(canManageSettings("ADMIN")).toBe(true);
    expect(canManageSettings("MEMBER")).toBe(false);
  });

  it("enforces role change authority constraints", () => {
    // OWNER can do anything
    expect(canChangeMemberRole("OWNER", "MEMBER", "ADMIN")).toBe(true);
    expect(canChangeMemberRole("OWNER", "ADMIN", "OWNER")).toBe(true);
    expect(canChangeMemberRole("OWNER", "OWNER", "MEMBER")).toBe(true);

    // ADMIN cannot promote to OWNER
    expect(canChangeMemberRole("ADMIN", "MEMBER", "OWNER")).toBe(false);
    // ADMIN cannot modify OWNER or ADMIN
    expect(canChangeMemberRole("ADMIN", "OWNER", "MEMBER")).toBe(false);
    expect(canChangeMemberRole("ADMIN", "ADMIN", "MEMBER")).toBe(false);
    // ADMIN can modify MEMBER to ADMIN
    expect(canChangeMemberRole("ADMIN", "MEMBER", "ADMIN")).toBe(true);

    // MEMBER cannot change any role
    expect(canChangeMemberRole("MEMBER", "MEMBER", "ADMIN")).toBe(false);
    expect(canChangeMemberRole("MEMBER", "ADMIN", "MEMBER")).toBe(false);
  });

  it("asserts tenant access and throws FORBIDDEN on foreign workspace", () => {
    const memberships = [
      { businessId: "biz-1", role: "ADMIN" as const },
      { businessId: "biz-2", role: "MEMBER" as const },
    ];

    expect(assertTenantAccess(memberships, "biz-1")).toBe("ADMIN");
    expect(assertTenantAccess(memberships, "biz-2")).toBe("MEMBER");

    expect(() => assertTenantAccess(memberships, "biz-3")).toThrow(AppError);
    expect(() => assertTenantAccess([], "biz-1")).toThrow(AppError);
    expect(() => assertTenantAccess(undefined, "biz-1")).toThrow(AppError);
  });

  it("asserts role permission level and throws FORBIDDEN if insufficient", () => {
    const memberships = [
      { businessId: "biz-1", role: "MEMBER" as const },
      { businessId: "biz-2", role: "OWNER" as const },
    ];

    // biz-1 has MEMBER role
    expect(() => assertRole(memberships, "biz-1", "ADMIN")).toThrow(AppError);
    expect(() => assertRole(memberships, "biz-1", "OWNER")).toThrow(AppError);
    expect(assertRole(memberships, "biz-1", "MEMBER")).toBe("MEMBER");

    // biz-2 has OWNER role
    expect(assertRole(memberships, "biz-2", "ADMIN")).toBe("OWNER");
    expect(assertRole(memberships, "biz-2", "OWNER")).toBe("OWNER");
  });

  it("enforces tenant isolation between active workspace and target workspace", () => {
    expect(() => enforceTenantIsolation("biz-1", "biz-1")).not.toThrow();
    expect(() => enforceTenantIsolation("biz-1", "biz-2")).toThrow(AppError);
  });
});
