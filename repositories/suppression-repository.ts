import type { SuppressionEntry, SuppressionReason } from "@/types/email";

export class SuppressionRepository {
  private suppressionStore: Map<string, SuppressionEntry> = new Map();

  private makeKey(businessId: string, email: string): string {
    return `${businessId}:${email.toLowerCase().trim()}`;
  }

  async isSuppressed(businessId: string, email: string): Promise<boolean> {
    const key = this.makeKey(businessId, email);
    return this.suppressionStore.has(key);
  }

  async addSuppression(
    businessId: string,
    email: string,
    reason: SuppressionReason = "UNSUBSCRIBED",
  ): Promise<SuppressionEntry> {
    const normalizedEmail = email.toLowerCase().trim();
    const key = this.makeKey(businessId, normalizedEmail);

    const entry: SuppressionEntry = {
      id: `sup_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      businessId,
      email: normalizedEmail,
      reason,
      createdAt: new Date().toISOString(),
    };

    this.suppressionStore.set(key, entry);
    return entry;
  }

  async listByBusiness(businessId: string): Promise<SuppressionEntry[]> {
    return Array.from(this.suppressionStore.values()).filter(
      (entry) => entry.businessId === businessId,
    );
  }

  async removeSuppression(
    businessId: string,
    email: string,
  ): Promise<boolean> {
    const key = this.makeKey(businessId, email);
    return this.suppressionStore.delete(key);
  }

  clearStore(): void {
    this.suppressionStore.clear();
  }
}

export const suppressionRepository = new SuppressionRepository();
