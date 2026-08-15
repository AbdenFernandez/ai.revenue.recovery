"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { useIntelligence } from "@/hooks/use-intelligence";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { AIMessageModal } from "@/components/ai/ai-message-modal";
import { AICampaignModal } from "@/components/ai/ai-campaign-modal";
import type {
  ChurnRiskTier,
  CustomerSegment,
} from "@/types/intelligence";

const RISK_BADGE_VARIANT: Record<
  ChurnRiskTier,
  "default" | "success" | "warning" | "info"
> = {
  critical: "default", // red styled via class
  high: "warning",
  medium: "info",
  low: "success",
};

export default function OpportunitiesPage() {
  const { activeBusinessId } = useAuth();
  const {
    opportunities,
    total,
    totalEstimatedRevenue,
    page,
    totalPages,
    filters,
    isLoading,
    error,
    setPage,
    setFilters,
  } = useIntelligence(activeBusinessId);

  // AI Modal States
  const [isCampaignOpen, setIsCampaignOpen] = useState(false);
  const [selectedCustomerForMsg, setSelectedCustomerForMsg] = useState<{
    id: string;
    name: string;
  } | null>(null);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            AI Revenue Recovery Opportunities
          </h1>
          <p className="text-sm text-zinc-500">
            Deterministic RFM analysis and prioritized customer win-back opportunities.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsCampaignOpen(true)}
          >
            💡 AI Campaign Strategy
          </Button>
          <Link href="/dashboard/customers">
            <Button variant="secondary" size="sm">
              👥 All Customers
            </Button>
          </Link>
        </div>
      </div>


      {/* Revenue Estimation Disclaimer Alert */}
      <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
        💡 <strong>Opportunity Model Note:</strong> Potential revenue figures are algorithmic recovery estimates calculated from historical purchase frequency, average order value, and recency decay. Revenue is never guaranteed.
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      {/* Summary KPI Banner */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Estimated Recoverable Pipeline
          </p>
          <p className="mt-1 text-2xl font-black text-emerald-600 dark:text-emerald-400">
            ${totalEstimatedRevenue.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Projected from {total} targetable customer opportunities
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Actionable Opportunities
          </p>
          <p className="mt-1 text-2xl font-black text-zinc-900 dark:text-zinc-100">
            {total}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Customers with positive recovery potential
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Algorithm Confidence
          </p>
          <p className="mt-1 text-2xl font-black text-indigo-600 dark:text-indigo-400">
            High (Deterministic)
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            RFM + Churn Risk + Win-back probability
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card title="Filter & Prioritize Opportunities" description="Segment and risk filters">
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          <Input
            id="oppSearch"
            label="Search Customer"
            placeholder="Name, email, company..."
            value={filters.search || ""}
            onChange={(e) => {
              setFilters((prev) => ({ ...prev, search: e.target.value }));
              setPage(1);
            }}
          />

          <Select
            id="segmentFilter"
            label="Customer Segment"
            value={filters.segment || "all"}
            onChange={(e) => {
              setFilters((prev) => ({
                ...prev,
                segment: e.target.value as CustomerSegment | "all",
              }));
              setPage(1);
            }}
            options={[
              { label: "All Segments", value: "all" },
              { label: "VIP", value: "VIP" },
              { label: "Win Back", value: "Win Back" },
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
            id="riskFilter"
            label="Churn Risk Tier"
            value={filters.riskTier || "all"}
            onChange={(e) => {
              setFilters((prev) => ({
                ...prev,
                riskTier: e.target.value as ChurnRiskTier | "all",
              }));
              setPage(1);
            }}
            options={[
              { label: "All Risk Tiers", value: "all" },
              { label: "Critical (>80%)", value: "critical" },
              { label: "High (60-80%)", value: "high" },
              { label: "Medium (35-60%)", value: "medium" },
              { label: "Low (<35%)", value: "low" },
            ]}
          />

          <Select
            id="sortByOpp"
            label="Sort By"
            value={filters.sortBy || "potentialRevenue"}
            onChange={(e) => {
              setFilters((prev) => ({
                ...prev,
                sortBy: e.target.value as "potentialRevenue" | "winBackScore" | "churnRisk" | "totalPurchaseAmount",
              }));
            }}
            options={[
              { label: "Potential Revenue ($)", value: "potentialRevenue" },
              { label: "Win-Back Opportunity Score", value: "winBackScore" },
              { label: "Churn Risk Score", value: "churnRisk" },
              { label: "Total Historical Spend", value: "totalPurchaseAmount" },
            ]}
          />
        </div>
      </Card>

      {/* Opportunities List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="py-12 text-center text-sm text-zinc-500">
            Analyzing customer intelligence and calculating opportunities...
          </div>
        ) : opportunities.length === 0 ? (
          <div className="rounded-lg border border-zinc-200 bg-white p-12 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
            No recovery opportunities match the selected criteria.
          </div>
        ) : (
          opportunities.map((opp) => (
            <div
              key={opp.customerId}
              className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-all hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                {/* Left Column: Customer & Segment Info */}
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/dashboard/customers/${opp.customerId}`}
                      className="text-base font-bold text-zinc-900 hover:underline dark:text-zinc-100"
                    >
                      {opp.customerName}
                    </Link>
                    {opp.company ? (
                      <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                        {opp.company}
                      </span>
                    ) : null}
                    <Badge
                      variant={
                        opp.segment === "VIP" || opp.segment === "High Value"
                          ? "success"
                          : opp.segment === "At Risk" || opp.segment === "Win Back"
                          ? "warning"
                          : "default"
                      }
                    >
                      {opp.segment}
                    </Badge>
                    <Badge variant={RISK_BADGE_VARIANT[opp.churnRiskTier]}>
                      Churn Risk: {Math.round(opp.churnRisk * 100)}% ({opp.churnRiskTier})
                    </Badge>
                  </div>

                  <p className="text-xs text-zinc-500">
                    {opp.customerEmail} {opp.phone ? `• ${opp.phone}` : ""}
                  </p>

                  {/* Explainable Reason Text */}
                  <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    🔍 {opp.reason}
                  </p>

                  {/* Recommended Action Playbook Box */}
                  <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 p-2.5 text-xs text-indigo-900 dark:border-indigo-900/60 dark:bg-indigo-950/30 dark:text-indigo-300">
                    <strong>Recommended Strategy:</strong> {opp.recommendedAction}
                  </div>

                  {/* RFM Score Pills */}
                  <div className="flex flex-wrap gap-2 pt-1 text-xs text-zinc-500">
                    <span className="rounded border border-zinc-200 px-2 py-0.5 dark:border-zinc-800">
                      Recency: <strong>{opp.rfm.recencyScore}/100</strong>
                    </span>
                    <span className="rounded border border-zinc-200 px-2 py-0.5 dark:border-zinc-800">
                      Frequency: <strong>{opp.rfm.frequencyScore}/100</strong>
                    </span>
                    <span className="rounded border border-zinc-200 px-2 py-0.5 dark:border-zinc-800">
                      Monetary: <strong>{opp.rfm.monetaryScore}/100</strong>
                    </span>
                    <span className="rounded border border-zinc-200 px-2 py-0.5 dark:border-zinc-800">
                      Value Score: <strong>{opp.rfm.customerValueScore}/100</strong>
                    </span>
                  </div>
                </div>

                {/* Right Column: Financial & Opportunity Projections */}
                <div className="flex flex-col items-end justify-between self-stretch border-t border-zinc-100 pt-3 md:border-t-0 md:pt-0">
                  <div className="text-right">
                    <p className="text-xs font-semibold uppercase text-zinc-500">
                      Estimated Opportunity
                    </p>
                    <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                      ${opp.potentialRevenue.toLocaleString()}
                    </p>
                    <p className="text-xs text-zinc-500">
                      Confidence: {Math.round(opp.confidenceScore * 100)}% • Win-Back: {Math.round(opp.winBackScore * 100)}%
                    </p>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() =>
                        setSelectedCustomerForMsg({
                          id: opp.customerId,
                          name: opp.customerName,
                        })
                      }
                    >
                      ⚡ AI Outreach
                    </Button>
                    <Link href={`/dashboard/customers/${opp.customerId}`}>
                      <Button variant="secondary" size="sm">
                        View Details →
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}

        {/* Pagination Footer */}
        {totalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <p className="text-xs text-zinc-500">
              Page {page} of {totalPages} ({total} total opportunities)
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1 || isLoading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages || isLoading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {/* AI Message Outreach Modal */}
      {selectedCustomerForMsg && activeBusinessId ? (
        <AIMessageModal
          isOpen={Boolean(selectedCustomerForMsg)}
          onClose={() => setSelectedCustomerForMsg(null)}
          businessId={activeBusinessId}
          customerId={selectedCustomerForMsg.id}
          customerName={selectedCustomerForMsg.name}
        />
      ) : null}

      {/* AI Campaign Strategist Modal */}
      {activeBusinessId ? (
        <AICampaignModal
          isOpen={isCampaignOpen}
          onClose={() => setIsCampaignOpen(false)}
          businessId={activeBusinessId}
        />
      ) : null}
    </div>
  );
}

