import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  extractJsonCandidate,
  repairJsonString,
  safeParseAiResponse,
} from "@/lib/ai/json-repair";

describe("AI Resilient JSON Repair & Schema Validator", () => {
  const sampleSchema = z.object({
    segment: z.string(),
    reason: z.string(),
    confidence: z.number().min(0).max(1),
  });

  const fallbackValue = {
    segment: "Active",
    reason: "Fallback reason",
    confidence: 0.5,
  };

  describe("extractJsonCandidate", () => {
    it("extracts clean JSON from markdown code fences", () => {
      const input = "```json\n{\n  \"segment\": \"VIP\",\n  \"reason\": \"High spend\",\n  \"confidence\": 0.95\n}\n```";
      const candidate = extractJsonCandidate(input);
      expect(candidate).toContain('"segment": "VIP"');
      expect(candidate.startsWith("{")).toBe(true);
      expect(candidate.endsWith("}")).toBe(true);
    });

    it("extracts JSON surrounded by conversational text", () => {
      const input = "Sure! Here is the analysis you requested:\n\n{\"segment\": \"Win Back\", \"reason\": \"Inactive 90 days\", \"confidence\": 0.8}\n\nHope this helps!";
      const candidate = extractJsonCandidate(input);
      expect(candidate).toBe('{"segment": "Win Back", "reason": "Inactive 90 days", "confidence": 0.8}');
    });

    it("returns empty string on empty input", () => {
      expect(extractJsonCandidate("")).toBe("");
    });
  });

  describe("repairJsonString", () => {
    it("removes trailing commas before closing braces", () => {
      const invalid = '{"segment": "At Risk", "reason": "No orders", "confidence": 0.7,}';
      const repaired = repairJsonString(invalid);
      expect(() => JSON.parse(repaired)).not.toThrow();
    });

    it("fixes smart/curly quotes", () => {
      const smartQuotes = '{\u201Csegment\u201D: \u201CDormant\u201D, \u201Creason\u201D: \u201C120 days\u201D, \u201Cconfidence\u201D: 0.6}';
      const repaired = repairJsonString(smartQuotes);
      expect(() => JSON.parse(repaired)).not.toThrow();
    });
  });

  describe("safeParseAiResponse", () => {
    it("successfully parses valid raw JSON", () => {
      const raw = JSON.stringify({
        segment: "VIP",
        reason: "Spent $5,000",
        confidence: 0.98,
      });

      const res = safeParseAiResponse(raw, sampleSchema, fallbackValue);
      expect(res.success).toBe(true);
      expect(res.isFallback).toBe(false);
      expect(res.data.segment).toBe("VIP");
      expect(res.data.confidence).toBe(0.98);
    });

    it("repairs markdown-wrapped JSON with trailing commas", () => {
      const raw = "```json\n{\n  \"segment\": \"High Value\",\n  \"reason\": \"AOV $400\",\n  \"confidence\": 0.85,\n}\n```";
      const res = safeParseAiResponse(raw, sampleSchema, fallbackValue);
      expect(res.success).toBe(true);
      expect(res.isFallback).toBe(false);
      expect(res.data.segment).toBe("High Value");
    });

    it("returns fallback on unparseable garbage text without throwing", () => {
      const raw = "I am an AI and cannot format this as JSON today.";
      const res = safeParseAiResponse(raw, sampleSchema, fallbackValue);
      expect(res.success).toBe(false);
      expect(res.isFallback).toBe(true);
      expect(res.data).toEqual(fallbackValue);
      expect(res.error).toBeDefined();
    });

    it("returns fallback on schema validation failure", () => {
      const raw = JSON.stringify({
        segment: "VIP",
        // missing "reason"
        confidence: 2.5, // out of range
      });

      const res = safeParseAiResponse(raw, sampleSchema, fallbackValue);
      expect(res.success).toBe(false);
      expect(res.isFallback).toBe(true);
      expect(res.data).toEqual(fallbackValue);
      expect(res.error).toContain("Schema validation error");
    });
  });
});
