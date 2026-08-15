import type { UserProfile } from "@/types/auth";

export class ProfileRepository {
  private static mockStore: Map<string, UserProfile> = new Map();

  static setMock(id: string, profile: UserProfile) {
    this.mockStore.set(id, profile);
  }

  static clearMocks() {
    this.mockStore.clear();
  }

  clearMocks() {
    ProfileRepository.clearMocks();
  }


  async findById(userId: string): Promise<UserProfile | null> {
    const mock = ProfileRepository.mockStore.get(userId);
    if (mock) {
      return { ...mock };
    }
    return null;
  }

  async findByEmail(email: string): Promise<UserProfile | null> {
    const normalized = email.toLowerCase().trim();
    for (const profile of ProfileRepository.mockStore.values()) {
      if (profile.email.toLowerCase() === normalized) {
        return { ...profile };
      }
    }
    return null;
  }

  async create(data: {
    id: string;
    email: string;
    fullName?: string | null;
    defaultBusinessId?: string | null;
  }): Promise<UserProfile> {
    const now = new Date().toISOString();
    const profile: UserProfile = {
      id: data.id,
      email: data.email.toLowerCase().trim(),
      fullName: data.fullName ?? null,
      defaultBusinessId: data.defaultBusinessId ?? null,
      createdAt: now,
      updatedAt: now,
    };
    ProfileRepository.mockStore.set(profile.id, profile);
    return { ...profile };
  }

  async update(
    userId: string,
    data: { fullName?: string | null; defaultBusinessId?: string | null },
  ): Promise<UserProfile | null> {
    const existing = ProfileRepository.mockStore.get(userId);
    if (!existing) {
      return null;
    }

    const updated: UserProfile = {
      ...existing,
      ...(data.fullName !== undefined ? { fullName: data.fullName } : {}),
      ...(data.defaultBusinessId !== undefined
        ? { defaultBusinessId: data.defaultBusinessId }
        : {}),
      updatedAt: new Date().toISOString(),
    };

    ProfileRepository.mockStore.set(userId, updated);
    return { ...updated };
  }
}

export const profileRepository = new ProfileRepository();
