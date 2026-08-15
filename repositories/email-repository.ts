import type {
  CampaignDispatchSummary,
  EmailDeliveryStatus,
  EmailDispatchLog,
} from "@/types/email";

export class EmailRepository {
  private logStore: Map<string, EmailDispatchLog> = new Map();
  private idempotencyIndex: Map<string, string> = new Map(); // key -> logId

  async findByIdempotencyKey(key: string): Promise<EmailDispatchLog | null> {
    const logId = this.idempotencyIndex.get(key);
    if (!logId) return null;
    return this.logStore.get(logId) || null;
  }

  async findById(id: string): Promise<EmailDispatchLog | null> {
    return this.logStore.get(id) || null;
  }

  async createLog(
    input: Omit<EmailDispatchLog, "id" | "createdAt" | "updatedAt">,
  ): Promise<EmailDispatchLog> {
    const existingLogId = this.idempotencyIndex.get(input.idempotencyKey);
    if (existingLogId) {
      const existing = this.logStore.get(existingLogId);
      if (existing) return existing;
    }

    const now = new Date().toISOString();
    const id = `elog_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const log: EmailDispatchLog = {
      ...input,
      id,
      createdAt: now,
      updatedAt: now,
    };

    this.logStore.set(id, log);
    this.idempotencyIndex.set(input.idempotencyKey, id);

    return log;
  }


  async updateStatus(
    id: string,
    status: EmailDeliveryStatus,
    details?: {
      errorMessage?: string;
      sentAt?: string;
      deliveredAt?: string;
      openedAt?: string;
      retryCount?: number;
    },
  ): Promise<EmailDispatchLog | null> {
    const existing = this.logStore.get(id);
    if (!existing) return null;

    const updated: EmailDispatchLog = {
      ...existing,
      status,
      errorMessage:
        details?.errorMessage !== undefined
          ? details.errorMessage
          : existing.errorMessage,
      sentAt: details?.sentAt !== undefined ? details.sentAt : existing.sentAt,
      deliveredAt:
        details?.deliveredAt !== undefined
          ? details.deliveredAt
          : existing.deliveredAt,
      openedAt:
        details?.openedAt !== undefined ? details.openedAt : existing.openedAt,
      retryCount:
        details?.retryCount !== undefined
          ? details.retryCount
          : existing.retryCount,
      updatedAt: new Date().toISOString(),
    };

    this.logStore.set(id, updated);
    return updated;
  }

  async listByCampaign(
    businessId: string,
    campaignId: string,
  ): Promise<EmailDispatchLog[]> {
    return Array.from(this.logStore.values()).filter(
      (log) => log.businessId === businessId && log.campaignId === campaignId,
    );
  }

  async getCampaignDispatchSummary(
    businessId: string,
    campaignId: string,
  ): Promise<CampaignDispatchSummary> {
    const logs = await this.listByCampaign(businessId, campaignId);

    const totalTargeted = logs.length;
    let sentCount = 0;
    let deliveredCount = 0;
    let failedCount = 0;
    let suppressedCount = 0;

    for (const log of logs) {
      if (log.status === "SENT" || log.status === "DELIVERED" || log.status === "OPENED") {
        sentCount++;
      }
      if (log.status === "DELIVERED" || log.status === "OPENED") {
        deliveredCount++;
      }
      if (log.status === "FAILED" || log.status === "BOUNCED") {
        failedCount++;
      }
      if (log.status === "SUPPRESSED") {
        suppressedCount++;
      }
    }

    return {
      campaignId,
      totalTargeted,
      sentCount,
      deliveredCount,
      failedCount,
      suppressedCount,
      duplicatesSkipped: 0,
      completed: logs.length > 0 && logs.every((l) => l.status !== "PENDING"),
    };
  }

  clearStore(): void {
    this.logStore.clear();
    this.idempotencyIndex.clear();
  }
}

export const emailRepository = new EmailRepository();
