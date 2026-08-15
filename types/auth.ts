export type UserRole = "OWNER" | "ADMIN" | "MEMBER";

export interface UserProfile {
  id: string;
  email: string;
  fullName: string | null;
  defaultBusinessId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Business {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessMember {
  id: string;
  businessId: string;
  userId: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
  profile?: {
    id: string;
    email: string;
    fullName: string | null;
  };
}

export type SubscriptionPlan = "free" | "starter" | "growth" | "enterprise";
export type SubscriptionStatus = "active" | "trialing" | "past_due" | "canceled";

export interface Subscription {
  id: string;
  businessId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  createdAt: string;
  updatedAt: string;
}

export type AiTonePreference = "professional" | "friendly" | "urgent" | "empathetic";

export interface CustomerPreferences {
  id: string;
  businessId: string;
  currency: string;
  timezone: string;
  inactivityThresholdDays: number;
  recoveryRateTarget: number;
  aiTonePreference: AiTonePreference;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  user: {
    id: string;
    email: string;
    fullName: string | null;
  };
  memberships: Array<{
    businessId: string;
    businessName: string;
    businessSlug: string;
    role: UserRole;
  }>;
  activeBusinessId: string | null;
}

export interface BusinessContext {
  business: Business;
  membership: BusinessMember;
  subscription: Subscription;
  preferences: CustomerPreferences;
}
