"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useCampaigns } from "@/hooks/use-campaigns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import type {
  AudienceEstimation,
  CampaignChannel,
  CampaignVariant,
  CampaignWithDetails,
} from "@/types/campaign";
import type { CustomerSegment } from "@/types/intelligence";

export default function NewCampaignPage() {
  const router = useRouter();
  const { activeBusinessId } = useAuth();
  const { createCampaign, approveCampaign, launchCampaign } =
    useCampaigns(activeBusinessId);




  // Form State
  const [segment, setSegment] = useState<CustomerSegment>("Win Back");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [channel, setChannel] = useState<CampaignChannel>("email");
  const [customGoal, setCustomGoal] = useState("Reactivate dormant high-value accounts");
  const [maxDiscountPercent, setMaxDiscountPercent] = useState(15);

  // Audience Estimation State
  const [estimation, setEstimation] = useState<AudienceEstimation | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);

  // AI Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [createdCampaign, setCreatedCampaign] =
    useState<CampaignWithDetails | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    null,
  );
  const [isApproving, setIsApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch Audience Estimation when segment changes
  useEffect(() => {
    if (!activeBusinessId) return;

    let isMounted = true;
    setIsEstimating(true);
    setError(null);

    fetch(`/api/businesses/${activeBusinessId}/campaigns/estimate-audience`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetSegment: segment }),
    })
      .then((res) => res.json())
      .then((json) => {
        if (isMounted) {
          if (json.data) {
            setEstimation(json.data);
            setName((prev) => prev || `${segment} Win-Back Recovery Campaign`);
          } else {
            setError(json.error?.message || "Failed to estimate audience.");
          }
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setError(
            err instanceof Error ? err.message : "Failed to estimate audience.",
          );
        }
      })
      .finally(() => {
        if (isMounted) setIsEstimating(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeBusinessId, segment]);


  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setError(null);

    try {
      const result = await createCampaign({
        name: name || `${segment} Campaign`,
        description: description || undefined,
        targetSegment: segment,
        channel,
        customGoal,
        maxDiscountPercent: Number(maxDiscountPercent),
      });

      setCreatedCampaign(result);
      if (result.variants.length > 0 && result.variants[0]) {
        setSelectedVariantId(result.variants[0].id);
      }

    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error generating AI campaign.",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApprove = async (andLaunch = false) => {
    if (!createdCampaign || !selectedVariantId) return;
    setIsApproving(true);
    setError(null);

    try {
      await approveCampaign(createdCampaign.id, selectedVariantId);
      if (andLaunch) {
        await launchCampaign(createdCampaign.id);
      }
      router.push(`/dashboard/campaigns/${createdCampaign.id}`);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error approving campaign.",
      );
      setIsApproving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/campaigns"
              className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              ← Back to Campaigns
            </Link>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            AI Campaign Generator Wizard
          </h1>
          <p className="text-sm text-zinc-500">
            Calculate segment audience, synthesize recovery strategies, review multi-variants, and approve.
          </p>
        </div>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      {!createdCampaign ? (
        <form onSubmit={handleGenerate} className="space-y-6">
          {/* Step 1: Audience & Segment Calculation Card */}
          <Card
            title="Step 1: Select Target Audience Segment"
            description="Algorithmic audience calculation based on customer recency and purchase history."
          >
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <Select
                  id="targetSegment"
                  label="Customer Segment"
                  value={segment}
                  onChange={(e) => {
                    setSegment(e.target.value as CustomerSegment);
                    setName(`${e.target.value} Win-Back Recovery Campaign`);
                  }}
                  options={[
                    { label: "Win Back (Dormant High Value)", value: "Win Back" },
                    { label: "VIP (Highest LTV Accounts)", value: "VIP" },
                    { label: "High Value (Top Spenders)", value: "High Value" },
                    { label: "At Risk (Cooling Off)", value: "At Risk" },
                    { label: "Dormant (Prolonged Inactivity)", value: "Dormant" },
                    { label: "Lost (Churned)", value: "Lost" },
                    { label: "Potential High Value", value: "Potential High Value" },
                    { label: "Active (Regular Cadence)", value: "Active" },
                    { label: "New (Recent First Order)", value: "New" },
                  ]}
                />

                <Select
                  id="targetChannel"
                  label="Outreach Channel"
                  value={channel}
                  onChange={(e) => setChannel(e.target.value as CampaignChannel)}
                  options={[
                    { label: "✉️ Email", value: "email" },
                    { label: "💬 SMS", value: "sms" },
                    { label: "🟢 WhatsApp", value: "whatsapp" },
                  ]}
                />
              </div>

              {/* Real-time Audience Estimation Scorecard */}
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-800/40">
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  Target Audience Summary
                </p>
                {isEstimating ? (
                  <div className="py-8 text-center text-xs text-zinc-500">
                    Calculating audience metrics...
                  </div>
                ) : estimation ? (
                  <div className="mt-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
                        <p className="text-xs text-zinc-500">Targetable Audience</p>
                        <p className="mt-1 text-2xl font-black text-zinc-900 dark:text-zinc-100">
                          {estimation.audienceCount}{" "}
                          <span className="text-xs font-normal text-zinc-500">
                            customers
                          </span>
                        </p>
                      </div>

                      <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
                        <p className="text-xs text-zinc-500">Est. Revenue Pool</p>
                        <p className="mt-1 text-2xl font-black text-emerald-600 dark:text-emerald-400">
                          ${estimation.totalEstimatedRevenue.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="rounded bg-blue-50/70 p-2.5 text-xs text-blue-900 dark:bg-blue-950/30 dark:text-blue-300">
                      💡 <strong>Consent Check:</strong> Only customers with active marketing consent and valid communication endpoints are included in the audience pool.
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </Card>

          {/* Step 2: Campaign Parameters & Guardrails */}
          <Card
            title="Step 2: Campaign Goals & Guardrails"
            description="Provide brand guidance and authorized discount constraints for the AI generator."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                id="campName"
                label="Campaign Name"
                placeholder="e.g. Q3 VIP Win-Back Drive"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              <Input
                id="campGoal"
                label="Primary Goal"
                placeholder="e.g. Re-engage high AOV customers with concierge incentive"
                value={customGoal}
                onChange={(e) => setCustomGoal(e.target.value)}
              />

              <Input
                id="campDiscount"
                label="Max Authorized Discount (%)"
                type="number"
                min={0}
                max={100}
                value={maxDiscountPercent}
                onChange={(e) => setMaxDiscountPercent(Number(e.target.value))}
              />

              <Input
                id="campDesc"
                label="Optional Description / Notes"
                placeholder="Internal notes about this campaign"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="mt-6 flex justify-end">
              <Button type="submit" isLoading={isGenerating}>
                {isGenerating
                  ? "Synthesizing AI Campaign & Variants..."
                  : "⚡ Generate AI Campaign Blueprint & Message Variants"}
              </Button>
            </div>
          </Card>
        </form>
      ) : (
        /* Step 3 & 4: Multi-Variant Review & Explicit Approval */
        <div className="space-y-6">
          <Card
            title="AI Campaign Strategy Blueprint"
            description="Synthesized strategic angle and target segment positioning."
          >
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  {createdCampaign.name}
                </h3>
                <Badge variant="info">Segment: {createdCampaign.targetSegment}</Badge>
                <Badge variant="warning">Status: DRAFT (Pending Approval)</Badge>
              </div>

              {createdCampaign.description ? (
                <p className="text-sm text-zinc-700 dark:text-zinc-300">
                  {createdCampaign.description}
                </p>
              ) : null}

              {createdCampaign.strategyRationale ? (
                <div className="rounded bg-indigo-50/70 p-3 text-xs text-indigo-900 dark:bg-indigo-950/30 dark:text-indigo-300">
                  💡 <strong>Strategic Rationale:</strong>{" "}
                  {createdCampaign.strategyRationale}
                </div>
              ) : null}
            </div>
          </Card>

          {/* Message Variants Comparison */}
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Review & Select Message Variant
              </h2>
              <p className="text-xs text-zinc-500">
                Review AI-generated variants and explicitly choose which variant to approve for outreach.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {createdCampaign.variants.map((variant: CampaignVariant) => {
                const isSelected = selectedVariantId === variant.id;
                return (
                  <div
                    key={variant.id}
                    onClick={() => setSelectedVariantId(variant.id)}
                    className={`cursor-pointer rounded-xl border p-5 transition-all ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-50/20 ring-2 ring-indigo-600 dark:border-indigo-500 dark:bg-indigo-950/20"
                        : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                        {variant.variantLabel}
                      </h4>
                      <Badge variant={isSelected ? "info" : "default"}>
                        {isSelected ? "✓ Selected Variant" : "Click to Select"}
                      </Badge>
                    </div>

                    <div className="mt-3 space-y-3">
                      {variant.subject ? (
                        <div>
                          <p className="text-xs font-semibold text-zinc-500">
                            Subject
                          </p>
                          <p className="mt-0.5 rounded border border-zinc-200 bg-zinc-50 p-2 text-xs font-medium text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                            {variant.subject}
                          </p>
                        </div>
                      ) : null}

                      <div>
                        <p className="text-xs font-semibold text-zinc-500">
                          Message Body
                        </p>
                        <div className="mt-0.5 whitespace-pre-wrap rounded border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                          {variant.messageBody}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-zinc-500">
                        <span>CTA: <strong>{variant.callToAction}</strong></span>
                        <span>Tone: <strong>{variant.tone}</strong></span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 5: Explicit Business Approval Bar */}
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950/30">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                  Explicit Business Approval Required
                </h4>
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  Campaigns will NEVER send messages automatically. Approving will transition this campaign from DRAFT to READY status.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={isApproving}
                  onClick={() => handleApprove(false)}
                >
                  {isApproving ? "Approving..." : "✓ Approve & Mark Ready"}
                </Button>
                <Button
                  size="sm"
                  disabled={isApproving}
                  onClick={() => handleApprove(true)}
                >
                  {isApproving ? "Launching..." : "🚀 Approve & Launch"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
