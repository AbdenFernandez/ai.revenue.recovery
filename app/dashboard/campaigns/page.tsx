"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { useCampaigns } from "@/hooks/use-campaigns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import type { CampaignChannel, CampaignStatus } from "@/types/campaign";
import type { CustomerSegment } from "@/types/intelligence";

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

export default function CampaignsPage() {
  const { activeBusinessId } = useAuth();
  const {
    campaigns,
    total,
    page,
    totalPages,
    filters,
    isLoading,
    error,
    setPage,
    setFilters,
  } = useCampaigns(activeBusinessId);

  // Compute Quick Stats
  const runningCount = campaigns.filter((c) => c.status === "RUNNING").length;
  const readyCount = campaigns.filter((c) => c.status === "READY").length;
  const draftCount = campaigns.filter((c) => c.status === "DRAFT").length;
  const completedCount = campaigns.filter((c) => c.status === "COMPLETED").length;
  const totalOpportunity = campaigns.reduce(
    (acc, c) => acc + (c.estimatedOpportunity || 0),
    0,
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            AI Recovery Campaigns
          </h1>
          <p className="text-sm text-zinc-500">
            Generate, approve, launch, and monitor automated customer win-back campaigns.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/dashboard/campaigns/new">
            <Button size="sm">⚡ Create AI Campaign</Button>
          </Link>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <p className="text-xs font-semibold uppercase text-zinc-500">
            Total Campaigns
          </p>
          <p className="mt-1 text-2xl font-black text-zinc-900 dark:text-zinc-100">
            {total}
          </p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase text-emerald-600 dark:text-emerald-400">
            Active / Running
          </p>
          <p className="mt-1 text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {runningCount}
          </p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase text-blue-600 dark:text-blue-400">
            Approved & Ready
          </p>
          <p className="mt-1 text-2xl font-black text-blue-600 dark:text-blue-400">
            {readyCount}
          </p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase text-purple-600 dark:text-purple-400">
            Completed / Drafts
          </p>
          <p className="mt-1 text-2xl font-black text-zinc-900 dark:text-zinc-100">
            {completedCount}{" "}
            <span className="text-xs font-normal text-zinc-500">
              ({draftCount} drafts)
            </span>
          </p>
        </Card>

        <Card>
          <p className="text-xs font-semibold uppercase text-zinc-500">
            Pipeline Opportunity
          </p>
          <p className="mt-1 text-2xl font-black text-zinc-900 dark:text-zinc-100">
            ${totalOpportunity.toLocaleString()}
          </p>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          <Input
            id="searchCampaigns"
            placeholder="Search campaigns..."
            value={filters.search || ""}
            onChange={(e) => {
              setFilters({ ...filters, search: e.target.value });
              setPage(1);
            }}
          />

          <Select
            id="filterStatus"
            value={filters.status || ""}
            onChange={(e) => {
              setFilters({
                ...filters,
                status: (e.target.value as CampaignStatus) || undefined,
              });
              setPage(1);
            }}
            options={[
              { label: "All Statuses", value: "" },
              { label: "DRAFT (Pending Review)", value: "DRAFT" },
              { label: "READY (Approved)", value: "READY" },
              { label: "RUNNING (Active)", value: "RUNNING" },
              { label: "PAUSED", value: "PAUSED" },
              { label: "COMPLETED", value: "COMPLETED" },
            ]}
          />

          <Select
            id="filterSegment"
            value={filters.targetSegment || ""}
            onChange={(e) => {
              setFilters({
                ...filters,
                targetSegment:
                  (e.target.value as CustomerSegment) || undefined,
              });
              setPage(1);
            }}
            options={[
              { label: "All Segments", value: "" },
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

          <Select
            id="filterChannel"
            value={filters.channel || ""}
            onChange={(e) => {
              setFilters({
                ...filters,
                channel: (e.target.value as CampaignChannel) || undefined,
              });
              setPage(1);
            }}
            options={[
              { label: "All Channels", value: "" },
              { label: "Email", value: "email" },
              { label: "SMS", value: "sms" },
              { label: "WhatsApp", value: "whatsapp" },
            ]}
          />
        </div>
      </Card>

      {/* Error Alert */}
      {error ? <Alert variant="error">{error}</Alert> : null}

      {/* Campaigns Listing */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="py-12 text-center text-sm text-zinc-500">
            Loading campaigns...
          </div>
        ) : campaigns.length === 0 ? (
          <Card>
            <div className="py-12 text-center">
              <span className="text-4xl">📢</span>
              <h3 className="mt-3 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                No campaigns found
              </h3>
              <p className="mt-1 text-sm text-zinc-500">
                Launch your first AI recovery campaign to re-engage dormant or high-value customers.
              </p>
              <div className="mt-4">
                <Link href="/dashboard/campaigns/new">
                  <Button size="sm">⚡ Create AI Campaign</Button>
                </Link>
              </div>
            </div>
          </Card>
        ) : (
          campaigns.map((camp) => (
            <div
              key={camp.id}
              className="rounded-xl border border-zinc-200 bg-white p-5 transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                      {camp.name}
                    </h2>
                    <Badge variant={STATUS_BADGE_VARIANT[camp.status]}>
                      {camp.status}
                    </Badge>
                    <Badge variant="info">
                      Target: {camp.targetSegment}
                    </Badge>
                    <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                      {CHANNEL_ICONS[camp.channel]}
                    </span>
                  </div>

                  {camp.description ? (
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                      {camp.description}
                    </p>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500">
                    <span>
                      Audience: <strong>{camp.audienceCount} customers</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Est. Opportunity:{" "}
                      <strong className="text-emerald-600 dark:text-emerald-400">
                        ${camp.estimatedOpportunity.toLocaleString()}
                      </strong>
                    </span>
                    <span>•</span>
                    <span>
                      Created: {new Date(camp.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link href={`/dashboard/campaigns/${camp.id}`}>
                    <Button variant="secondary" size="sm">
                      Control Center →
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))
        )}

        {/* Pagination */}
        {totalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <p className="text-xs text-zinc-500">
              Page {page} of {totalPages} ({total} total campaigns)
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1 || isLoading}
                onClick={() => setPage(Math.max(1, page - 1))}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages || isLoading}
                onClick={() => setPage(Math.min(totalPages, page + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
