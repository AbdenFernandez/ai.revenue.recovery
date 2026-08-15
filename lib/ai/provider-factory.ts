import type { AIProvider } from "./provider-interface";
import { MockAIProvider } from "./mock-provider";
import { OpenAICompatibleProvider } from "./openai-provider";

export class AIProviderFactory {
  private static instance: AIProvider | null = null;

  static getProvider(): AIProvider {
    if (!AIProviderFactory.instance) {
      const providerType = process.env.AI_PROVIDER || "mock";

      if (providerType === "openai" && process.env.OPENAI_API_KEY) {
        AIProviderFactory.instance = new OpenAICompatibleProvider();
      } else {
        AIProviderFactory.instance = new MockAIProvider();
      }
    }

    return AIProviderFactory.instance;
  }

  static setProvider(provider: AIProvider): void {
    AIProviderFactory.instance = provider;
  }

  static reset(): void {
    AIProviderFactory.instance = null;
  }
}
