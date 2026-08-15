import type { z } from "zod";

/**
 * Strips markdown code blocks, conversational preambles, and extracts candidate JSON substrings.
 */
export function extractJsonCandidate(rawText: string): string {
  if (!rawText || typeof rawText !== "string") return "";

  let cleaned = rawText.trim();

  // 1. Remove markdown code blocks: ```json ... ``` or ``` ... ```
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    cleaned = codeBlockMatch[1].trim();
  }

  // 2. Locate outermost JSON object {...} or array [...]
  const firstBrace = cleaned.indexOf("{");
  const firstBracket = cleaned.indexOf("[");
  const firstIdx =
    firstBrace !== -1 && firstBracket !== -1
      ? Math.min(firstBrace, firstBracket)
      : Math.max(firstBrace, firstBracket);

  const lastBrace = cleaned.lastIndexOf("}");
  const lastBracket = cleaned.lastIndexOf("]");
  const lastIdx = Math.max(lastBrace, lastBracket);

  if (firstIdx !== -1 && lastIdx !== -1 && lastIdx >= firstIdx) {
    cleaned = cleaned.substring(firstIdx, lastIdx + 1);
  }

  return cleaned.trim();
}

/**
 * Attempts common repairs on malformed JSON strings (removing trailing commas, balancing quotes).
 */
export function repairJsonString(jsonCandidate: string): string {
  let repaired = jsonCandidate;

  // 1. Remove trailing commas before closing braces/brackets
  repaired = repaired.replace(/,\s*([}\]])/g, "$1");

  // 2. Replace smart/curly quotes with standard double quotes
  repaired = repaired.replace(/[\u201C\u201D]/g, '"');
  repaired = repaired.replace(/[\u2018\u2019]/g, "'");

  return repaired;
}

export interface ParseAiResponseResult<T> {
  success: boolean;
  data: T;
  isFallback: boolean;
  rawParsed?: unknown;
  error?: string;
}

/**
 * 3-step resilient JSON parser and schema validator. Never throws; returns fallback on failure.
 */
export function safeParseAiResponse<T>(
  rawText: string,
  schema: z.ZodType<T>,
  fallback: T,
): ParseAiResponseResult<T> {
  if (!rawText || typeof rawText !== "string") {
    return {
      success: false,
      data: fallback,
      isFallback: true,
      error: "Empty or invalid raw text input.",
    };
  }

  const candidate = extractJsonCandidate(rawText);

  // Attempt 1: Direct JSON parse
  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    // Attempt 2: Repaired JSON parse
    try {
      const repaired = repairJsonString(candidate);
      parsed = JSON.parse(repaired);
    } catch (parseErr) {
      return {
        success: false,
        data: fallback,
        isFallback: true,
        error: `JSON parse failure: ${
          parseErr instanceof Error ? parseErr.message : "Malformed syntax"
        }`,
      };
    }
  }

  // Attempt 3: Schema validation
  const validationResult = schema.safeParse(parsed);
  if (validationResult.success) {
    return {
      success: true,
      data: validationResult.data,
      isFallback: false,
      rawParsed: parsed,
    };
  }

  return {
    success: false,
    data: fallback,
    isFallback: true,
    rawParsed: parsed,
    error: `Schema validation error: ${validationResult.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join(", ")}`,
  };
}
