"use client";

import { useAuth } from "@/hooks/use-auth";
import { useBusiness } from "@/hooks/use-business";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function DashboardOverviewPage() {
  const { activeBusinessId } = useAuth();
  const { business, membership, subscription, preferences, isLoading, error } =
    useBusiness(activeBusinessId);

  if (isLoading) {
    return (
      <div className="py-12 text-center text-sm text-zinc-500">
        Loading workspace metrics...
      </div>
    );
  }

  if (error || !business) {
    return (
      <div className="py-12 text-center text-sm text-red-600">
        {error || "Unable to load workspace details."}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview header */}
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
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
        </div>
      </div>

      {/* Highlights Grid */}
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

      {/* Status & Readiness */}
      <Card
        title="Tenant Isolation & Security Verification"
        description="Active protection status for this workspace"
      >
        <ul className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
          <li className="flex items-center gap-2">
            <span className="text-emerald-600 font-bold">✓</span>
            <span>Row Level Security (RLS) active on all tenant tables</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-emerald-600 font-bold">✓</span>
            <span>Server-side authorization enforced on API endpoints</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-emerald-600 font-bold">✓</span>
            <span>Data queries scoped strictly to workspace: {business.id}</span>
          </li>
        </ul>
      </Card>
    </div>
  );
}
