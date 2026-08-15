import type { Subscription, SubscriptionPlan, SubscriptionStatus } from "@/types/auth";

export class SubscriptionRepository {
  private static mockStore: Map<string, Subscription> = new Map();

  static setMock(id: string, sub: Subscription) {
    this.mockStore.set(id, sub);
  }

  static clearMocks() {
    this.mockStore.clear();
  }

  clearMocks() {
    SubscriptionRepository.clearMocks();
  }


  async findByBusinessId(businessId: string): Promise<Subscription | null> {
    for (const sub of SubscriptionRepository.mockStore.values()) {
      if (sub.businessId === businessId) {
        return { ...sub };
      }
    }
    return null;
  }

  async create(data: {
    businessId: string;
    plan?: SubscriptionPlan;
    status?: SubscriptionStatus;
  }): Promise<Subscription> {
    const id = crypto.randomUUID();
    const now = new Date();
    const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const subscription: Subscription = {
      id,
      businessId: data.businessId,
      plan: data.plan ?? "free",
      status: data.status ?? "active",
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: end.toISOString(),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    SubscriptionRepository.mockStore.set(id, subscription);
    return { ...subscription };
  }

  async update(
    businessId: string,
    data: { plan?: SubscriptionPlan; status?: SubscriptionStatus },
  ): Promise<Subscription | null> {
    const existing = await this.findByBusinessId(businessId);
    if (!existing) {
      return null;
    }

    const updated: Subscription = {
      ...existing,
      ...(data.plan ? { plan: data.plan } : {}),
      ...(data.status ? { status: data.status } : {}),
      updatedAt: new Date().toISOString(),
    };

    SubscriptionRepository.mockStore.set(existing.id, updated);
    return { ...updated };
  }
}

export const subscriptionRepository = new SubscriptionRepository();
