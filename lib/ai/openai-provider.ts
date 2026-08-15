import type {
  AIActionRecommendation,
  AICampaignIdea,
  AICustomerRecommendation,
  AIGeneratedMessage,
  AISegmentSummary,
} from "@/types/ai";
import {
  actionRecommendationSchema,
  campaignIdeaSchema,
  customerRecommendationSchema,
  messageGenerationSchema,
  segmentSummarySchema,
} from "@/schemas/ai";
import { safeParseAiResponse } from "./json-repair";
import { buildSystemPromptWithGuardrails } from "./guardrails";
import { MockAIProvider } from "./mock-provider";
import type {
  ActionPromptInput,
  AIProvider,
  CampaignPromptInput,
  CustomerAnalysisPromptInput,
  MessagePromptInput,
  SegmentSummaryPromptInput,
} from "./provider-interface";

export class OpenAICompatibleProvider implements AIProvider {
  readonly name: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly mockFallback: MockAIProvider;

  constructor(options?: {
    name?: string;
    apiKey?: string;
    baseUrl?: string;
    model?: string;
  }) {
    this.name = options?.name || "openai";
    this.apiKey = options?.apiKey || process.env.OPENAI_API_KEY || "";
    this.baseUrl =
      options?.baseUrl ||
      process.env.OPENAI_BASE_URL ||
      "https://api.openai.com/v1";
    this.model = options?.model || process.env.OPENAI_MODEL || "gpt-4o-mini";
    this.mockFallback = new MockAIProvider();
  }

  private async callChatCompletion(
    systemPrompt: string,
    userPrompt: string,
  ): Promise<string | null> {
    if (!this.apiKey) {
      return null;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.3,
          response_format: { type: "json_object" },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);


      if (!response.ok) {
        return null;
      }

      const json = await response.json();
      return json.choices?.[0]?.message?.content || null;
    } catch {
      return null;
    }
  }

  async analyzeCustomer(
    input: CustomerAnalysisPromptInput,
  ): Promise<AICustomerRecommendation> {
    const fallback = await this.mockFallback.analyzeCustomer(input);
    const systemPrompt = buildSystemPromptWithGuardrails(input.business);
    const userPrompt = `Analyze this customer for revenue recovery and output JSON with keys "segment", "reason", "recommended_action", "message_angle", "confidence":\n${JSON.stringify(
      input.customer,
      null,
      2,
    )}`;

    const raw = await this.callChatCompletion(systemPrompt, userPrompt);
    if (!raw) return fallback;

    const result = safeParseAiResponse(
      raw,
      customerRecommendationSchema,
      fallback,
    );
    return result.data;
  }

  async generateCampaign(
    input: CampaignPromptInput,
  ): Promise<AICampaignIdea> {
    const fallback = await this.mockFallback.generateCampaign(input);
    const systemPrompt = buildSystemPromptWithGuardrails(input.business);
    const userPrompt = `Generate a targeted campaign idea for segment "${
      input.segment
    }". Output JSON with keys "campaignTitle", "targetSegment", "strategicAngle", "keyThemes", "suggestedChannels", "rationale".`;

    const raw = await this.callChatCompletion(systemPrompt, userPrompt);
    if (!raw) return fallback;

    const result = safeParseAiResponse(raw, campaignIdeaSchema, fallback);
    return result.data;
  }

  async generateMessage(
    input: MessagePromptInput,
  ): Promise<AIGeneratedMessage> {
    const fallback = await this.mockFallback.generateMessage(input);
    const systemPrompt = buildSystemPromptWithGuardrails(input.business);
    const userPrompt = `Draft a personalized recovery message for channel "${
      input.channel
    }". Customer data:\n${JSON.stringify(
      input.customer,
      null,
      2,
    )}\nIncentive: ${input.incentiveOffer || "None"}. Output JSON with keys "subject", "messageBody", "callToAction", "tone", "rationale".`;

    const raw = await this.callChatCompletion(systemPrompt, userPrompt);
    if (!raw) return fallback;

    const result = safeParseAiResponse(
      raw,
      messageGenerationSchema,
      fallback,
    );
    return result.data;
  }

  async summarizeSegment(
    input: SegmentSummaryPromptInput,
  ): Promise<AISegmentSummary> {
    const fallback = await this.mockFallback.summarizeSegment(input);
    const systemPrompt = buildSystemPromptWithGuardrails(input.business);
    const userPrompt = `Summarize segment "${input.segment}". Output JSON with keys "segment", "healthStatus", "keyOpportunity", "recoveryStrategy", "estimatedImpact".`;

    const raw = await this.callChatCompletion(systemPrompt, userPrompt);
    if (!raw) return fallback;

    const result = safeParseAiResponse(raw, segmentSummarySchema, fallback);
    return result.data;
  }

  async recommendAction(
    input: ActionPromptInput,
  ): Promise<AIActionRecommendation> {
    const fallback = await this.mockFallback.recommendAction(input);
    const systemPrompt = buildSystemPromptWithGuardrails(input.business);
    const userPrompt = `Recommend recovery action for customer:\n${JSON.stringify(
      input.customer,
      null,
      2,
    )}\nOutput JSON with keys "actionType", "priority", "rationale", "expectedOutcome".`;

    const raw = await this.callChatCompletion(systemPrompt, userPrompt);
    if (!raw) return fallback;

    const result = safeParseAiResponse(
      raw,
      actionRecommendationSchema,
      fallback,
    );
    return result.data;
  }
}
