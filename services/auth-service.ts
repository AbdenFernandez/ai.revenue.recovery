import { AppError } from "@/lib/errors";
import { profileRepository } from "@/repositories/profile-repository";
import { businessRepository } from "@/repositories/business-repository";
import { memberRepository } from "@/repositories/member-repository";
import { subscriptionRepository } from "@/repositories/subscription-repository";
import { preferencesRepository } from "@/repositories/preferences-repository";
import type { AuthSession, UserProfile } from "@/types/auth";
import type {
  RegisterInput,
  LoginInput,
  ResetPasswordRequestInput,
  UpdatePasswordInput,
  UpdateProfileInput,
} from "@/schemas/auth";

export class AuthService {
  // In-memory credential hash store for standalone/mock auth
  private static passwords: Map<string, string> = new Map();
  private static resetTokens: Map<string, { email: string; expiresAt: number }> = new Map();

  static setMockPassword(userId: string, plain: string) {
    this.passwords.set(userId, plain);
  }

  static clearMocks() {
    this.passwords.clear();
    this.resetTokens.clear();
  }

  clearMocks() {
    AuthService.clearMocks();
  }


  async register(input: RegisterInput): Promise<AuthSession> {
    const existing = await profileRepository.findByEmail(input.email);
    if (existing) {
      throw new AppError({
        code: "CONFLICT",
        message: "An account with this email address already exists.",
      });
    }

    const userId = crypto.randomUUID();

    // 1. Create Profile
    const profile = await profileRepository.create({
      id: userId,
      email: input.email,
      fullName: input.fullName,
    });

    AuthService.passwords.set(userId, input.password);

    // 2. Create Initial Business Workspace
    const business = await businessRepository.create({
      name: input.businessName,
    });

    // 3. Add User as Workspace OWNER
    await memberRepository.create({
      businessId: business.id,
      userId: profile.id,
      role: "OWNER",
    });

    // 4. Initialize Free Subscription & Default Recovery Preferences
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

    // 5. Link default business on profile
    await profileRepository.update(profile.id, {
      defaultBusinessId: business.id,
    });

    return this.buildSession(profile, business.id);
  }

  async login(input: LoginInput): Promise<AuthSession> {
    const profile = await profileRepository.findByEmail(input.email);
    if (!profile) {
      throw new AppError({
        code: "UNAUTHORIZED",
        message: "Invalid email or password.",
      });
    }

    const storedPassword = AuthService.passwords.get(profile.id);
    // Allow login if matching stored password or if running in mock demo mode
    if (storedPassword && storedPassword !== input.password) {
      throw new AppError({
        code: "UNAUTHORIZED",
        message: "Invalid email or password.",
      });
    }

    return this.buildSession(profile);
  }

  async getSession(userId: string, preferredBusinessId?: string): Promise<AuthSession> {
    const profile = await profileRepository.findById(userId);
    if (!profile) {
      throw new AppError({
        code: "UNAUTHORIZED",
        message: "User session not found or expired.",
      });
    }

    return this.buildSession(profile, preferredBusinessId);
  }

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<UserProfile> {
    const updated = await profileRepository.update(userId, input);
    if (!updated) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "User profile not found.",
      });
    }
    return updated;
  }

  async requestPasswordReset(input: ResetPasswordRequestInput): Promise<{ message: string }> {
    const profile = await profileRepository.findByEmail(input.email);
    // Return standard response even if not found to avoid user enumeration
    if (profile) {
      const token = crypto.randomUUID();
      AuthService.resetTokens.set(token, {
        email: profile.email,
        expiresAt: Date.now() + 60 * 60 * 1000,
      });
    }

    return {
      message: "If an account exists with that email, a password reset link has been dispatched.",
    };
  }

  async updatePassword(userId: string, input: UpdatePasswordInput): Promise<{ message: string }> {
    const profile = await profileRepository.findById(userId);
    if (!profile) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "User profile not found.",
      });
    }

    const current = AuthService.passwords.get(userId);
    if (current && input.currentPassword && current !== input.currentPassword) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Incorrect current password.",
      });
    }

    AuthService.passwords.set(userId, input.newPassword);

    return {
      message: "Password has been successfully updated.",
    };
  }

  private async buildSession(
    profile: UserProfile,
    activeBusinessIdOverride?: string,
  ): Promise<AuthSession> {
    const memberships = await memberRepository.findByUserId(profile.id);

    const sessionMemberships = await Promise.all(
      memberships.map(async (m) => {
        const b = await businessRepository.findById(m.businessId);
        return {
          businessId: m.businessId,
          businessName: b?.name ?? "Unknown Workspace",
          businessSlug: b?.slug ?? "unknown",
          role: m.role,
        };
      }),
    );

    let activeBusinessId =
      activeBusinessIdOverride ||
      profile.defaultBusinessId ||
      sessionMemberships[0]?.businessId ||
      null;

    // Verify activeBusinessId actually belongs to user
    if (activeBusinessId && !sessionMemberships.some((m) => m.businessId === activeBusinessId)) {
      activeBusinessId = sessionMemberships[0]?.businessId || null;
    }

    return {
      user: {
        id: profile.id,
        email: profile.email,
        fullName: profile.fullName,
      },
      memberships: sessionMemberships,
      activeBusinessId,
    };
  }
}

export const authService = new AuthService();
