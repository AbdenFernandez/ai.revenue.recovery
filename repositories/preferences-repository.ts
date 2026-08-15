import type { CustomerPreferences, AiTonePreference } from "@/types/auth";

export class PreferencesRepository {
  private static mockStore: Map<string, CustomerPreferences> = new Map();

  static setMock(id: string, pref: CustomerPreferences) {
    this.mockStore.set(id, pref);
  }

  static clearMocks() {
    this.mockStore.clear();
  }

  clearMocks() {
    PreferencesRepository.clearMocks();
  }


  async findByBusinessId(businessId: string): Promise<CustomerPreferences | null> {
    for (const pref of PreferencesRepository.mockStore.values()) {
      if (pref.businessId === businessId) {
        return { ...pref };
      }
    }
    return null;
  }

  async create(data: {
    businessId: string;
    currency?: string;
    timezone?: string;
    inactivityThresholdDays?: number;
    recoveryRateTarget?: number;
    aiTonePreference?: AiTonePreference;
  }): Promise<CustomerPreferences> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const preferences: CustomerPreferences = {
      id,
      businessId: data.businessId,
      currency: (data.currency ?? "USD").toUpperCase(),
      timezone: data.timezone ?? "UTC",
      inactivityThresholdDays: data.inactivityThresholdDays ?? 60,
      recoveryRateTarget: data.recoveryRateTarget ?? 0.15,
      aiTonePreference: data.aiTonePreference ?? "professional",
      createdAt: now,
      updatedAt: now,
    };

    PreferencesRepository.mockStore.set(id, preferences);
    return { ...preferences };
  }

  async update(
    businessId: string,
    data: {
      currency?: string;
      timezone?: string;
      inactivityThresholdDays?: number;
      recoveryRateTarget?: number;
      aiTonePreference?: AiTonePreference;
    },
  ): Promise<CustomerPreferences | null> {
    const existing = await this.findByBusinessId(businessId);
    if (!existing) {
      return null;
    }

    const updated: CustomerPreferences = {
      ...existing,
      ...(data.currency ? { currency: data.currency.toUpperCase() } : {}),
      ...(data.timezone ? { timezone: data.timezone } : {}),
      ...(data.inactivityThresholdDays !== undefined
        ? { inactivityThresholdDays: data.inactivityThresholdDays }
        : {}),
      ...(data.recoveryRateTarget !== undefined
        ? { recoveryRateTarget: data.recoveryRateTarget }
        : {}),
      ...(data.aiTonePreference
        ? { aiTonePreference: data.aiTonePreference }
        : {}),
      updatedAt: new Date().toISOString(),
    };

    PreferencesRepository.mockStore.set(existing.id, updated);
    return { ...updated };
  }
}

export const preferencesRepository = new PreferencesRepository();
