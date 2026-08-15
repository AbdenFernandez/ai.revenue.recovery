import type { Business } from "@/types/auth";

export class BusinessRepository {
  private static mockStore: Map<string, Business> = new Map();

  static setMock(id: string, business: Business) {
    this.mockStore.set(id, business);
  }

  static clearMocks() {
    this.mockStore.clear();
  }

  clearMocks() {
    BusinessRepository.clearMocks();
  }


  async findById(businessId: string): Promise<Business | null> {
    const mock = BusinessRepository.mockStore.get(businessId);
    return mock ? { ...mock } : null;
  }

  async findBySlug(slug: string): Promise<Business | null> {
    for (const business of BusinessRepository.mockStore.values()) {
      if (business.slug === slug) {
        return { ...business };
      }
    }
    return null;
  }

  async create(data: { name: string; slug?: string }): Promise<Business> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const baseSlug =
      data.slug ||
      data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    
    // Ensure slug uniqueness
    let slug = baseSlug;
    let counter = 1;
    while (await this.findBySlug(slug)) {
      slug = `${baseSlug}-${counter++}`;
    }

    const business: Business = {
      id,
      name: data.name.trim(),
      slug,
      createdAt: now,
      updatedAt: now,
    };

    BusinessRepository.mockStore.set(id, business);
    return { ...business };
  }

  async update(businessId: string, data: { name?: string }): Promise<Business | null> {
    const existing = BusinessRepository.mockStore.get(businessId);
    if (!existing) {
      return null;
    }

    const updated: Business = {
      ...existing,
      ...(data.name ? { name: data.name.trim() } : {}),
      updatedAt: new Date().toISOString(),
    };

    BusinessRepository.mockStore.set(businessId, updated);
    return { ...updated };
  }

  async delete(businessId: string): Promise<boolean> {
    return BusinessRepository.mockStore.delete(businessId);
  }
}

export const businessRepository = new BusinessRepository();
