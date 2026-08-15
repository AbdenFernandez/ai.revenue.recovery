"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import type { AIGeneratedMessage } from "@/types/ai";

interface AIMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessId: string;
  customerId: string;
  customerName: string;
}

export function AIMessageModal({
  isOpen,
  onClose,
  businessId,
  customerId,
  customerName,
}: AIMessageModalProps) {
  const [channel, setChannel] = useState<"email" | "sms" | "whatsapp">("email");
  const [tone, setTone] = useState("friendly");
  const [incentive, setIncentive] = useState("15% off return order");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMessage, setGeneratedMessage] =
    useState<AIGeneratedMessage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setError(null);
    setCopied(false);

    try {
      const res = await fetch(
        `/api/businesses/${businessId}/ai/generate-message`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerId,
            channel,
            customTone: tone,
            incentiveOffer: incentive,
          }),
        },
      );

      const json = await res.json();
      if (!res.ok) {
        throw new Error(
          json.error?.message || "Failed to generate AI outreach message.",
        );
      }

      setGeneratedMessage(json.data);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error generating AI message.",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!generatedMessage) return;
    const textToCopy =
      channel === "email"
        ? `Subject: ${generatedMessage.subject}\n\n${generatedMessage.messageBody}\n\nCTA: ${generatedMessage.callToAction}`
        : generatedMessage.messageBody;

    void navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`AI Recovery Outreach: ${customerName}`}
      description="Generate personalized, anti-hallucinatory recovery messages using minimum required context."
    >
      <div className="space-y-4">
        {error ? <Alert variant="error">{error}</Alert> : null}

        <form onSubmit={handleGenerate} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <Select
              id="aiChannel"
              label="Channel"
              value={channel}
              onChange={(e) =>
                setChannel(e.target.value as "email" | "sms" | "whatsapp")
              }
              options={[
                { label: "Email", value: "email" },
                { label: "SMS", value: "sms" },
                { label: "WhatsApp", value: "whatsapp" },
              ]}
            />

            <Select
              id="aiTone"
              label="Tone of Voice"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              options={[
                { label: "Friendly & Warm", value: "friendly" },
                { label: "Professional & Direct", value: "professional" },
                { label: "Urgent Win-Back", value: "urgent" },
                { label: "Executive VIP", value: "premium" },
              ]}
            />

            <Input
              id="aiIncentive"
              label="Authorized Incentive"
              placeholder="e.g. 15% discount"
              value={incentive}
              onChange={(e) => setIncentive(e.target.value)}
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" isLoading={isGenerating}>
              {isGenerating ? "Generating Message..." : "⚡ Generate Message"}
            </Button>
          </div>
        </form>

        {generatedMessage ? (
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 space-y-3 dark:border-zinc-800 dark:bg-zinc-800/50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Generated Outreach Draft
              </span>
              <div className="flex items-center gap-2">
                <Badge variant="info">Tone: {generatedMessage.tone}</Badge>
                <Button variant="secondary" size="sm" onClick={handleCopy}>
                  {copied ? "✓ Copied!" : "📋 Copy Message"}
                </Button>
              </div>
            </div>

            {channel === "email" ? (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-zinc-500">Subject</p>
                <div className="rounded border border-zinc-200 bg-white p-2 text-sm font-medium text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
                  {generatedMessage.subject}
                </div>
              </div>
            ) : null}

            <div className="space-y-1">
              <p className="text-xs font-semibold text-zinc-500">Message Body</p>
              <div className="whitespace-pre-wrap rounded border border-zinc-200 bg-white p-3 text-sm text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
                {generatedMessage.messageBody}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>
                Call to Action: <strong>{generatedMessage.callToAction}</strong>
              </span>
            </div>

            <div className="rounded bg-indigo-50/50 p-2 text-xs text-indigo-900 dark:bg-indigo-950/20 dark:text-indigo-300">
              💡 <strong>AI Rationale:</strong> {generatedMessage.rationale}
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
