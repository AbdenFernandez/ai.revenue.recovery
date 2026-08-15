"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import type {
  CampaignChannel,
  CampaignStatus,
  CampaignVariant,
  CampaignWithDetails,
} from "@/types/campaign";

const STATUS_BADGE_VARIANT: Record<
  CampaignStatus,
  "default" | "success" | "warning" | "info"
> = {
  RUNNING: "success",
  READY: "info",
  SCHEDULED: "warning",
  DRAFT: "default",
  PAUSED: "warning",
  COMPLETED: "success",
  FAILED: "default",
};

const CHANNEL_ICONS: Record<CampaignChannel, string> = {
  email: "✉️ Email",
  sms: "💬 SMS",
  whatsapp: "🟢 WhatsApp",
};

export default function CampaignDetailPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = use(params);
  const router = useRouter();
  const { activeBusinessId } = useAuth();

  const [campaign, setCampaign] = useState<CampaignWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

  const fetchCampaign = useCallback(async () => {
    if (!activeBusinessId) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/businesses/${activeBusinessId}/campaigns/${campaignId}`,
      );
      const json = await res.json();

      if (!res.ok) {
        throw new Error(
          json.error?.message || "Failed to fetch campaign details.",
        );
      }

      setCampaign(json.data);
      const approved = json.data.variants.find(
        (v: CampaignVariant) => v.isApproved,
      );
      if (approved) {
        setSelectedVariantId(approved.id);
      } else if (json.data.variants.length > 0) {
        setSelectedVariantId(json.data.variants[0].id);
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error loading campaign.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [activeBusinessId, campaignId]);

  useEffect(() => {
    void fetchCampaign();
  }, [fetchCampaign]);

  // Action handlers
  const handleApprove = async () => {
    if (!activeBusinessId || !selectedVariantId) return;
    setIsActionLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/businesses/${activeBusinessId}/campaigns/${campaignId}/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ approvedVariantId: selectedVariantId }),
        },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Approval failed.");
      setCampaign(json.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleLaunch = async () => {
    if (!activeBusinessId) return;
    setIsActionLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/businesses/${activeBusinessId}/campaigns/${campaignId}/launch`,
        { method: "POST" },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Launch failed.");
      setCampaign(json.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handlePause = async () => {
    if (!activeBusinessId) return;
    setIsActionLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/businesses/${activeBusinessId}/campaigns/${campaignId}/pause`,
        { method: "POST" },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Pause failed.");
      setCampaign(json.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleResume = async () => {
    if (!activeBusinessId) return;
    setIsActionLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/businesses/${activeBusinessId}/campaigns/${campaignId}/resume`,
        { method: "POST" },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Resume failed.");
      setCampaign(json.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!activeBusinessId || !campaign) return;
    setIsActionLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/businesses/${activeBusinessId}/campaigns/${campaignId}/complete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            opened: Math.round(campaign.audienceCount * 0.45),
            replied: Math.round(campaign.audienceCount * 0.18),
            converted: Math.round(campaign.audienceCount * 0.12),
            revenueAttributed: Math.round(campaign.estimatedOpportunity * 0.65),
          }),
        },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Completion failed.");
      setCampaign(json.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!activeBusinessId) return;
    if (!confirm("Are you sure you want to delete this campaign?")) return;

    setIsActionLoading(true);
    try {
      const res = await fetch(
        `/api/businesses/${activeBusinessId}/campaigns/${campaignId}`,
        { method: "DELETE" },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Delete failed.");
      router.push("/dashboard/campaigns");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Delete failed.");
      setIsActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-12 text-center text-sm text-zinc-500">
        Loading campaign details...
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="space-y-4">
        <Alert variant="error">Campaign not found</Alert>
        <Link href="/dashboard/campaigns">
          <Button variant="secondary" size="sm">
            ← Back to Campaigns
          </Button>
        </Link>
      </div>
    );
  }

  const analytics = campaign.analytics || {
    targeted: campaign.audienceCount || 0,
    prepared: campaign.audienceCount || 0,
    sent: 0,
    delivered: 0,
    opened: 0,
    replied: 0,
    converted: 0,
    revenueAttributed: 0,
  };
  const approvedVariant = campaign.variants?.find((v) => v.isApproved);
  const activeVariant =
    campaign.variants?.find((v) => v.id === selectedVariantId) ||
    approvedVariant ||
    campaign.variants?.[0];


  return (
    <div className="space-y-6">
      {/* Back Link & Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <Link
            href="/dashboard/campaigns"
            className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            ← Back to Campaigns
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              {campaign.name}
            </h1>
            <Badge variant={STATUS_BADGE_VARIANT[campaign.status]}>
              {campaign.status}
            </Badge>
            <Badge variant="info">Target: {campaign.targetSegment}</Badge>
            <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              {CHANNEL_ICONS[campaign.channel]}
            </span>
          </div>
        </div>

        {/* Lifecycle Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {campaign.status === "DRAFT" ? (
            <Button
              size="sm"
              isLoading={isActionLoading}
              onClick={handleApprove}
            >
              ✓ Approve Selected Variant
            </Button>
          ) : null}

          {campaign.status === "READY" ? (
            <Button
              size="sm"
              isLoading={isActionLoading}
              onClick={handleLaunch}
            >
              🚀 Launch Campaign
            </Button>
          ) : null}

          {campaign.status === "RUNNING" ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                isLoading={isActionLoading}
                onClick={handlePause}
              >
                ⏸️ Pause
              </Button>
              <Button
                size="sm"
                isLoading={isActionLoading}
                onClick={handleComplete}
              >
                ✓ Complete Campaign
              </Button>
            </>
          ) : null}

          {campaign.status === "PAUSED" ? (
            <>
              <Button
                size="sm"
                isLoading={isActionLoading}
                onClick={handleResume}
              >
                ▶️ Resume
              </Button>
              <Button
                variant="secondary"
                size="sm"
                isLoading={isActionLoading}
                onClick={handleComplete}
              >
                ✓ Complete Campaign
              </Button>
            </>
          ) : null}

          {campaign.status !== "RUNNING" ? (
            <Button
              variant="danger"
              size="sm"
              disabled={isActionLoading}
              onClick={handleDelete}
            >
              Delete
            </Button>
          ) : null}
        </div>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      {/* Analytics Scorecard & Conversion Funnel */}
      <Card
        title="Campaign Analytics & Attribution Funnel"
        description="End-to-end recovery performance and financial attribution."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <p className="text-xs text-zinc-500">🎯 Targeted Audience</p>
            <p className="mt-1 text-xl font-bold text-zinc-900 dark:text-zinc-100">
              {analytics.targeted.toLocaleString()}
            </p>
          </div>

          <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <p className="text-xs text-zinc-500">📤 Sent & Delivered</p>
            <p className="mt-1 text-xl font-bold text-zinc-900 dark:text-zinc-100">
              {analytics.delivered.toLocaleString()}{" "}
              <span className="text-xs font-normal text-zinc-500">
                ({analytics.sent} sent)
              </span>
            </p>
          </div>

          <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <p className="text-xs text-zinc-500">💬 Customer Responses</p>
            <p className="mt-1 text-xl font-bold text-indigo-600 dark:text-indigo-400">
              {analytics.replied.toLocaleString()}{" "}
              <span className="text-xs font-normal text-zinc-500">
                ({analytics.opened} opened)
              </span>
            </p>
          </div>

          <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <p className="text-xs text-zinc-500">💰 Attributed Revenue</p>
            <p className="mt-1 text-xl font-black text-emerald-600 dark:text-emerald-400">
              ${analytics.revenueAttributed.toLocaleString()}{" "}
              <span className="text-xs font-normal text-zinc-500">
                ({analytics.converted} recovered)
              </span>
            </p>
          </div>
        </div>

        {/* Funnel Progress Indicator */}
        <div className="mt-5 space-y-1.5">
          <div className="flex justify-between text-xs text-zinc-500">
            <span>Funnel Conversion Rate</span>
            <span>
              {analytics.targeted > 0
                ? `${Math.round((analytics.converted / analytics.targeted) * 100)}%`
                : "0%"}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{
                width: `${
                  analytics.targeted > 0
                    ? Math.min(
                        100,
                        Math.max(
                          5,
                          Math.round(
                            (analytics.converted / analytics.targeted) * 100,
                          ),
                        ),
                      )
                    : 0
                }%`,
              }}
            />
          </div>
        </div>
      </Card>

      {/* Main Grid: Strategy Rationale & Message Variant Viewer */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Strategy Blueprint Card */}
        <Card title="Campaign Strategy Blueprint" description="AI synthesis parameters">
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-zinc-500">Strategic Angle</p>
              <p className="mt-1 text-sm text-zinc-800 dark:text-zinc-200">
                {campaign.description || "No specific angle provided."}
              </p>
            </div>

            {campaign.strategyRationale ? (
              <div className="rounded bg-indigo-50/70 p-3 text-xs text-indigo-900 dark:bg-indigo-950/30 dark:text-indigo-300">
                💡 <strong>AI Rationale:</strong> {campaign.strategyRationale}
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
              <div className="rounded border border-zinc-200 p-2 dark:border-zinc-800">
                <span className="text-zinc-500">Target Segment:</span>
                <p className="font-bold text-zinc-900 dark:text-zinc-100">
                  {campaign.targetSegment}
                </p>
              </div>
              <div className="rounded border border-zinc-200 p-2 dark:border-zinc-800">
                <span className="text-zinc-500">Est. Opportunity:</span>
                <p className="font-bold text-emerald-600 dark:text-emerald-400">
                  ${campaign.estimatedOpportunity.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Message Variants Card */}
        <Card title="Message Variants & Content" description="Review or switch approved copy">
          <div className="space-y-4">
            {/* Variant Switcher Tabs */}
            <div className="flex flex-wrap gap-2">
              {(campaign.variants || []).map((variant) => (
                <button
                  key={variant.id}

                  type="button"
                  onClick={() => setSelectedVariantId(variant.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    activeVariant?.id === variant.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
                  }`}
                >
                  {variant.variantLabel}{" "}
                  {variant.isApproved ? "✓ (Approved)" : ""}
                </button>
              ))}
            </div>

            {activeVariant ? (
              <div className="space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/40">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-500">
                    Tone: <strong>{activeVariant.tone}</strong>
                  </span>
                  {activeVariant.isApproved ? (
                    <Badge variant="success">✓ Active Approved Variant</Badge>
                  ) : (
                    <Badge variant="default">Pending Approval</Badge>
                  )}
                </div>

                {activeVariant.subject ? (
                  <div>
                    <p className="text-xs font-semibold text-zinc-500">Subject</p>
                    <p className="mt-0.5 rounded border border-zinc-200 bg-white p-2 text-xs font-medium text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
                      {activeVariant.subject}
                    </p>
                  </div>
                ) : null}

                <div>
                  <p className="text-xs font-semibold text-zinc-500">
                    Message Body
                  </p>
                  <div className="mt-0.5 whitespace-pre-wrap rounded border border-zinc-200 bg-white p-3 text-xs text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
                    {activeVariant.messageBody}
                  </div>
                </div>

                <div className="text-xs text-zinc-500">
                  Call to Action: <strong>{activeVariant.callToAction}</strong>
                </div>

                {campaign.status === "DRAFT" && !activeVariant.isApproved ? (
                  <div className="pt-2">
                    <Button
                      size="sm"
                      isLoading={isActionLoading}
                      onClick={handleApprove}
                    >
                      ✓ Approve This Variant
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  );
}
