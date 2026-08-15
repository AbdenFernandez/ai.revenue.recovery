import { beforeEach, describe, expect, it } from "vitest";
import { authService } from "@/services/auth-service";

import { profileRepository } from "@/repositories/profile-repository";
import { businessRepository } from "@/repositories/business-repository";
import { memberRepository } from "@/repositories/member-repository";
import { AppError } from "@/lib/errors";

describe("AuthService Unit Tests", () => {
  beforeEach(() => {
    profileRepository.clearMocks();
    businessRepository.clearMocks();
    memberRepository.clearMocks();
    authService.clearMocks();
  });


  it("registers a new user and sets up initial workspace with OWNER role", async () => {
    const session = await authService.register({
      email: "founder@startup.io",
      password: "Password123",
      fullName: "Alex Founder",
      businessName: "Startup Labs",
    });

    expect(session.user.email).toBe("founder@startup.io");
    expect(session.user.fullName).toBe("Alex Founder");
    expect(session.memberships.length).toBe(1);
    expect(session.memberships[0]?.role).toBe("OWNER");
    expect(session.memberships[0]?.businessName).toBe("Startup Labs");
    expect(session.activeBusinessId).toBe(session.memberships[0]?.businessId);
  });

  it("rejects duplicate email registration with CONFLICT (409)", async () => {
    await authService.register({
      email: "duplicate@domain.com",
      password: "Password123",
      fullName: "Original User",
      businessName: "Original Workspace",
    });

    await expect(
      authService.register({
        email: "duplicate@domain.com",
        password: "Password123",
        fullName: "Imposter User",
        businessName: "Imposter Workspace",
      }),
    ).rejects.toThrowError(AppError);
  });

  it("authenticates valid credentials and rejects incorrect passwords", async () => {
    await authService.register({
      email: "login-test@domain.com",
      password: "CorrectPassword123",
      fullName: "Login Tester",
      businessName: "Testing HQ",
    });

    // Valid login
    const session = await authService.login({
      email: "login-test@domain.com",
      password: "CorrectPassword123",
    });
    expect(session.user.email).toBe("login-test@domain.com");

    // Invalid password
    await expect(
      authService.login({
        email: "login-test@domain.com",
        password: "WrongPassword999",
      }),
    ).rejects.toThrowError(AppError);
  });

  it("updates user profile name and default business", async () => {
    const session = await authService.register({
      email: "profile-update@domain.com",
      password: "Password123",
      fullName: "Old Name",
      businessName: "Profile Workspace",
    });

    const updated = await authService.updateProfile(session.user.id, {
      fullName: "New Name",
    });

    expect(updated.fullName).toBe("New Name");
  });

  it("handles password reset and password update", async () => {
    const session = await authService.register({
      email: "reset-test@domain.com",
      password: "OldPassword123",
      fullName: "Reset Tester",
      businessName: "Reset Corp",
    });

    const resetReq = await authService.requestPasswordReset({
      email: "reset-test@domain.com",
    });
    expect(resetReq.message).toContain("link has been dispatched");

    const updateRes = await authService.updatePassword(session.user.id, {
      currentPassword: "OldPassword123",
      newPassword: "NewPassword456",
    });
    expect(updateRes.message).toContain("successfully updated");

    // Login with new password
    const newSession = await authService.login({
      email: "reset-test@domain.com",
      password: "NewPassword456",
    });
    expect(newSession.user.id).toBe(session.user.id);
  });
});
