import type {
  EmailMessage,
  SendBatchResult,
  SendEmailResult,
} from "@/types/email";
import type { EmailProvider } from "./provider-interface";
import { MockEmailProvider } from "./mock-provider";

export class SmtpEmailProvider implements EmailProvider {
  readonly name = "smtp";
  private readonly apiKey: string;
  private readonly fromAddress: string;
  private readonly mockFallback: MockEmailProvider;

  constructor(options?: { apiKey?: string; fromAddress?: string }) {
    this.apiKey = options?.apiKey || process.env.EMAIL_API_KEY || "";
    this.fromAddress =
      options?.fromAddress ||
      process.env.EMAIL_FROM ||
      "noreply@revenue-recovery.ai";
    this.mockFallback = new MockEmailProvider();
  }

  async sendEmail(message: EmailMessage): Promise<SendEmailResult> {
    const timestamp = new Date().toISOString();

    // If no API key configured, fallback gracefully to mock provider
    if (!this.apiKey) {
      return this.mockFallback.sendEmail(message);
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const endpoint = process.env.RESEND_API_URL || "https://api.resend.com/emails";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          from: message.from || this.fromAddress,
          to: [message.to],
          subject: message.subject,
          html: message.html,
          text: message.text,
          reply_to: message.replyTo,
          headers: {
            "X-Idempotency-Key": message.idempotencyKey,
            ...message.headers,
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        return {
          success: false,
          status: "FAILED",
          error: errorJson.message || `Provider returned status ${res.status}`,
          timestamp,
        };
      }

      const data = await res.json();
      return {
        success: true,
        messageId: data.id || `msg_${Date.now()}`,
        status: "SENT",
        timestamp,
      };
    } catch (err: unknown) {
      return {
        success: false,
        status: "FAILED",
        error:
          err instanceof Error
            ? err.message
            : "Network error sending email via provider.",
        timestamp,
      };
    }
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
