import type {
  EmailMessage,
  SendBatchResult,
  SendEmailResult,
} from "@/types/email";
import type { EmailProvider } from "./provider-interface";

export class MockEmailProvider implements EmailProvider {
  readonly name = "mock";
  private static sentEmails: EmailMessage[] = [];
  private static failureRate = 0; // 0 to 1
  private static shouldFailNextTimes = 0;

  static getSentEmails(): EmailMessage[] {
    return [...this.sentEmails];
  }

  static clearSentEmails(): void {
    this.sentEmails = [];
    this.failureRate = 0;
    this.shouldFailNextTimes = 0;
  }

  static setFailureRate(rate: number): void {
    this.failureRate = Math.min(1, Math.max(0, rate));
  }

  static failNextSends(times: number): void {
    this.shouldFailNextTimes = times;
  }

  async sendEmail(message: EmailMessage): Promise<SendEmailResult> {
    const timestamp = new Date().toISOString();

    // Check simulated consecutive failures
    if (MockEmailProvider.shouldFailNextTimes > 0) {
      MockEmailProvider.shouldFailNextTimes--;
      return {
        success: false,
        status: "FAILED",
        error: "Simulated transient network timeout (Mock Provider)",
        timestamp,
      };
    }

    // Check simulated failure rate
    if (
      MockEmailProvider.failureRate > 0 &&
      Math.random() < MockEmailProvider.failureRate
    ) {
      return {
        success: false,
        status: "FAILED",
        error: "Simulated random provider rate limit error (Mock Provider)",
        timestamp,
      };
    }

    // Record email
    MockEmailProvider.sentEmails.push({ ...message });

    return {
      success: true,
      messageId: `mock_msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      status: "SENT",
      timestamp,
    };
  }

  async sendBatch(messages: EmailMessage[]): Promise<SendBatchResult> {
    const results: SendEmailResult[] = [];
    let sent = 0;
    let failed = 0;

    for (const msg of messages) {
      const res = await this.sendEmail(msg);
      results.push(res);
      if (res.success) {
        sent++;
      } else {
        failed++;
      }
    }

    return {
      total: messages.length,
      sent,
      failed,
      suppressed: 0,
      results,
    };
  }
}
