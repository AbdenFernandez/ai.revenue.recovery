import { describe, it, expect, beforeEach } from "vitest";
import { MockEmailProvider } from "@/lib/email/mock-provider";
import { EmailProviderFactory } from "@/lib/email/provider-factory";
import {
  compilePersonalizedContent,
  renderEmailHtml,
  renderEmailPlainText,
} from "@/lib/email/templates";
import {
  generateUnsubscribeToken,
  verifyUnsubscribeToken,
} from "@/lib/email/tokens";
import type { EmailMessage } from "@/types/email";

describe("EmailProvider Abstraction & Templates", () => {
  beforeEach(() => {
    MockEmailProvider.clearSentEmails();
    EmailProviderFactory.resetProvider();
  });

  it("sends single email via MockEmailProvider and records dispatch", async () => {
    const provider = new MockEmailProvider();
    const message: EmailMessage = {
      to: "customer@example.com",
      subject: "VIP Offer",
      html: "<p>Hello</p>",
      text: "Hello",
      idempotencyKey: "key-123",
    };

    const result = await provider.sendEmail(message);

    expect(result.success).toBe(true);
    expect(result.status).toBe("SENT");
    expect(result.messageId).toBeDefined();

    const sent = MockEmailProvider.getSentEmails();
    expect(sent.length).toBe(1);
    expect(sent[0]?.to).toBe("customer@example.com");
  });

  it("sends batch emails correctly and tallies successes", async () => {
    const provider = new MockEmailProvider();
    const messages: EmailMessage[] = [
      {
        to: "alice@example.com",
        subject: "Welcome",
        html: "<p>A</p>",
        text: "A",
        idempotencyKey: "key-a",
      },
      {
        to: "bob@example.com",
        subject: "Welcome",
        html: "<p>B</p>",
        text: "B",
        idempotencyKey: "key-b",
      },
    ];

    const batchResult = await provider.sendBatch(messages);

    expect(batchResult.total).toBe(2);
    expect(batchResult.sent).toBe(2);
    expect(batchResult.failed).toBe(0);
    expect(MockEmailProvider.getSentEmails().length).toBe(2);
  });

  it("resolves default mock provider from EmailProviderFactory", () => {
    const provider = EmailProviderFactory.getProvider();
    expect(provider.name).toBe("mock");
  });

  it("personalizes dynamic template variables correctly", () => {
    const rawTemplate = "Hi {{customer_name}}, your {{service_type}} discount at {{company}} is ready!";
    const variables = {
      customer_name: "Sarah Connor",
      service_type: "Cybersecurity",
      company: "Acme Corp",
    };

    const compiled = compilePersonalizedContent(rawTemplate, variables);
    expect(compiled).toBe("Hi Sarah Connor, your Cybersecurity discount at Acme Corp is ready!");
  });

  it("renders compliant HTML email containing 1-click unsubscribe footer link", () => {
    const html = renderEmailHtml({
      businessName: "SaaS Recovery",
      recipientName: "John Doe",
      messageBody: "We miss you!\n\nHere is 20% off.",
      callToAction: "Claim 20% Off",
      ctaUrl: "https://example.com/offer",
      unsubscribeUrl: "https://example.com/unsubscribe?token=abc123xyz",
      subject: "Exclusive Win-Back Offer",
    });

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("SaaS Recovery");
    expect(html).toContain("Hi John Doe,");
    expect(html).toContain("Claim 20% Off");
    expect(html).toContain("https://example.com/unsubscribe?token=abc123xyz");
    expect(html).toContain("unsubscribe in 1-click");
  });

  it("renders compliant plain text email with unsubscribe instructions", () => {
    const text = renderEmailPlainText({
      businessName: "SaaS Recovery",
      recipientName: "John Doe",
      messageBody: "We miss you! Here is 20% off.",
      callToAction: "Claim 20% Off",
      ctaUrl: "https://example.com/offer",
      unsubscribeUrl: "https://example.com/unsubscribe?token=abc123xyz",
      subject: "Exclusive Win-Back Offer",
    });

    expect(text).toContain("Hi John Doe,");
    expect(text).toContain("Claim 20% Off: https://example.com/offer");
    expect(text).toContain("To unsubscribe in 1-click, visit: https://example.com/unsubscribe?token=abc123xyz");
  });

  it("generates and verifies tamper-proof cryptographic unsubscribe tokens", () => {
    const businessId = "biz-alpha-100";
    const customerId = "cust-beta-200";
    const email = "user@test.com";

    const token = generateUnsubscribeToken(businessId, customerId, email);
    expect(token).toBeTypeOf("string");

    const payload = verifyUnsubscribeToken(token);
    expect(payload).not.toBeNull();
    expect(payload?.businessId).toBe(businessId);
    expect(payload?.customerId).toBe(customerId);
    expect(payload?.email).toBe(email);

    // Tampered token must be rejected
    const tampered = `${token}tampered`;
    expect(verifyUnsubscribeToken(tampered)).toBeNull();
  });
});
