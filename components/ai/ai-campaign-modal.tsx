"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import type { AICampaignIdea } from "@/types/ai";
import type { CustomerSegment } from "@/types/intelligence";

interface AICampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessId: string;
}

export function AICampaignModal({
  isOpen,
  onClose,
  businessId,
}: AICampaignModalProps) {
  const [segment, setSegment] = useState<CustomerSegment>("Win Back");
  const [goal, setGoal] = useState("Reactivate dormant high-value accounts");
  const [maxDiscount, setMaxDiscount] = useState<number>(15);
  const [isGenerating, setIsGenerating] = useState(false);
  const [campaign, setCampaign] = useState<AICampaignIdea | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/businesses/${businessId}/ai/generate-campaign`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            segment,
            goal,
            maxDiscountPercent: Number(maxDiscount),
          }),
        },
      );

      const json = await res.json();
      if (!res.ok) {
        throw new Error(
          json.error?.message || "Failed to generate AI campaign idea.",
        );
      }

      setCampaign(json.data);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error generating AI campaign.",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="AI Revenue Campaign Strategist"
      description="Generate targeted segment recovery campaigns and multi-channel strategies."
    >
      <div className="space-y-4">
        {error ? <Alert variant="error">{error}</Alert> : null}

        <form onSubmit={handleGenerate} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <Select
              id="campSegment"
              label="Target Segment"
              value={segment}
              onChange={(e) => setSegment(e.target.value as CustomerSegment)}
              options={[
                { label: "Win Back", value: "Win Back" },
                { label: "VIP", value: "VIP" },
                { label: "High Value", value: "High Value" },
                { label: "At Risk", value: "At Risk" },
                { label: "Dormant", value: "Dormant" },
                { label: "Lost", value: "Lost" },
                { label: "Potential High Value", value: "Potential High Value" },
                { label: "Active", value: "Active" },
                { label: "New", value: "New" },
              ]}
            />

            <Input
              id="campGoal"
              label="Primary Goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
            />

            <Input
              id="campDiscount"
              label="Max Discount (%)"
              type="number"
              min={0}
              max={100}
              value={maxDiscount}
              onChange={(e) => setMaxDiscount(Number(e.target.value))}
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" isLoading={isGenerating}>
              {isGenerating ? "Synthesizing Strategy..." : "⚡ Generate Strategy"}
            </Button>
          </div>
        </form>

        {campaign ? (
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 space-y-3 dark:border-zinc-800 dark:bg-zinc-800/50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Campaign Blueprint
              </span>
              <Badge variant="success">Segment: {campaign.targetSegment}</Badge>
            </div>

            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                {campaign.campaignTitle}
              </h3>
              <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                {campaign.strategicAngle}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold text-zinc-500">Key Themes</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {campaign.keyThemes.map((theme, i) => (
                  <span
                    key={i}
                    className="rounded bg-white px-2 py-0.5 text-xs font-medium text-zinc-800 shadow-sm dark:bg-zinc-700 dark:text-zinc-200"
                  >
                    #{theme}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-zinc-500">
                Suggested Channels:{" "}
                <span className="font-medium text-zinc-800 dark:text-zinc-200">
                  {campaign.suggestedChannels.join(", ").toUpperCase()}
                </span>
              </p>
            </div>

            <div className="rounded bg-indigo-50/50 p-2.5 text-xs text-indigo-900 dark:bg-indigo-950/20 dark:text-indigo-300">
              💡 <strong>Strategic Rationale:</strong> {campaign.rationale}
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
