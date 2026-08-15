"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { useBusiness } from "@/hooks/use-business";
import { useIntelligence } from "@/hooks/use-intelligence";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SegmentChart } from "@/components/dashboard/segment-chart";
import { ChurnRiskChart } from "@/components/dashboard/churn-risk-chart";

export default function DashboardOverviewPage() {
  const { activeBusinessId } = useAuth();
  const { business, membership, subscription, preferences, isLoading: isBizLoading, error: bizError } =
    useBusiness(activeBusinessId);
  const { overview } = useIntelligence(activeBusinessId);


  if (isBizLoading) {
    return (
      <div className="py-12 text-center text-sm text-zinc-500">
        Loading workspace metrics...
      </div>
    );
  }

  if (bizError || !business) {
    return (
      <div className="py-12 text-center text-sm text-red-600">
        {bizError || "Unable to load workspace details."}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {business.name}
          </h1>
          <p className="text-sm text-zinc-500">
            Workspace ID: <code className="text-xs">{business.id}</code>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="info">Plan: {subscription?.plan.toUpperCase()}</Badge>
          <Badge variant="success">Status: {subscription?.status.toUpperCase()}</Badge>
          <Link href="/dashboard/opportunities">
            <Button size="sm">
              ⚡ AI Opportunities →
            </Button>
          </Link>
        </div>
      </div>

      {/* Revenue Intelligence KPI Grid */}
      {overview ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-xs font-medium text-zinc-500">Total Customers</p>
            <p className="mt-1 text-xl font-bold text-zinc-900 dark:text-zinc-100">
              {overview.totalCustomers}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-xs font-medium text-emerald-600">Active</p>
            <p className="mt-1 text-xl font-bold text-zinc-900 dark:text-zinc-100">
              {overview.activeCustomers}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-xs font-medium text-amber-600">At-Risk</p>
            <p className="mt-1 text-xl font-bold text-zinc-900 dark:text-zinc-100">
              {overview.atRiskCustomers}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-xs font-medium text-purple-600">High-Value Inactive</p>
            <p className="mt-1 text-xl font-bold text-zinc-900 dark:text-zinc-100">
              {overview.highValueInactiveCustomers}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-xs font-medium text-emerald-600">Estimated Opportunity</p>
            <p className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400">
              ${overview.totalEstimatedOpportunity.toLocaleString()}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-xs font-medium text-zinc-500">Average Value</p>
            <p className="mt-1 text-xl font-bold text-zinc-900 dark:text-zinc-100">
              ${overview.averageCustomerValue.toLocaleString()}
            </p>
          </div>
        </div>
      ) : null}

      {/* Visual Analytics: Customer Segmentation & Churn Risk */}
      {overview && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card
            title="Customer Segments (RFM Distribution)"
            description="Algorithmic classification based on recency, frequency, and monetary spend"
          >
            <SegmentChart
              distribution={overview.segmentDistribution}
              totalCustomers={overview.totalCustomers}
            />
          </Card>

          <Card
            title="Churn Risk Analysis"
            description="Probability of customer departure across inactivity tiers"
          >
            <ChurnRiskChart
              distribution={overview.churnRiskDistribution}
              totalCustomers={overview.totalCustomers}
            />
          </Card>
        </div>
      )}

      {/* Workspace Settings & Operational Baseline */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card title="Your Role" description="Permission level in this workspace">
          <div className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            {membership?.role}
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            {membership?.role === "OWNER"
              ? "Full workspace ownership & billing control"
              : membership?.role === "ADMIN"
              ? "Team & operational settings management"
              : "Standard member access"}
          </p>
        </Card>

        <Card
          title="Recovery Inactivity Threshold"
          description="Qualifying criteria for churn detection"
        >
          <div className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            {preferences?.inactivityThresholdDays} Days
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Target recovery rate:{" "}
            {((preferences?.recoveryRateTarget ?? 0.15) * 100).toFixed(0)}%
          </p>
        </Card>

        <Card
          title="AI Agent Tone"
          description="Personalization style for recovery outreach"
        >
          <div className="text-2xl font-semibold capitalize text-zinc-900 dark:text-zinc-100">
            {preferences?.aiTonePreference}
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Currency: {preferences?.currency} | Timezone: {preferences?.timezone}
          </p>
        </Card>
      </div>

      {/* Security & Verification Card */}
      <Card
        title="Revenue Intelligence Engine Active"
        description="Deterministic RFM scoring and recovery models operational"
      >
        <ul className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
          <li className="flex items-center gap-2">
            <span className="text-emerald-600 font-bold">✓</span>
            <span>Real-time RFM scoring (Recency, Frequency, Monetary, Engagement)</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-emerald-600 font-bold">✓</span>
            <span>Deterministic 9-tier customer segmentation & churn risk modeling</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-emerald-600 font-bold">✓</span>
            <span>Explainable recovery opportunities with custom playbook strategies</span>
          </li>
        </ul>
      </Card>
    </div>
  );
}
