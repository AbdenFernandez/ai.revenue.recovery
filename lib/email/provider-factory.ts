import type { EmailProvider } from "./provider-interface";
import { MockEmailProvider } from "./mock-provider";
import { SmtpEmailProvider } from "./smtp-provider";

export class EmailProviderFactory {
  private static cachedProvider: EmailProvider | null = null;

  static getProvider(): EmailProvider {
    if (this.cachedProvider) {
      return this.cachedProvider;
    }

    const providerType = (
      process.env.EMAIL_PROVIDER || "mock"
    ).toLowerCase();

    if (providerType === "smtp" || providerType === "resend") {
      this.cachedProvider = new SmtpEmailProvider();
    } else {
      this.cachedProvider = new MockEmailProvider();
    }

    return this.cachedProvider;
  }

  static setProvider(provider: EmailProvider): void {
    this.cachedProvider = provider;
  }

  static resetProvider(): void {
    this.cachedProvider = null;
  }
}
