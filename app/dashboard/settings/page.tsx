"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useBusiness } from "@/hooks/use-business";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import type { AiTonePreference } from "@/types/auth";

export default function DashboardSettingsPage() {
  const { activeBusinessId } = useAuth();
  const {
    business,
    preferences,
    role,
    isLoading,
    error,
    updateBusiness,
    updatePreferences,
  } = useBusiness(activeBusinessId);

  const [businessName, setBusinessName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [timezone, setTimezone] = useState("UTC");
  const [inactivityDays, setInactivityDays] = useState(60);
  const [recoveryTarget, setRecoveryTarget] = useState(15);
  const [aiTone, setAiTone] = useState<AiTonePreference>("professional");

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const canEdit = role === "OWNER" || role === "ADMIN";

  useEffect(() => {
    if (business) {
      setBusinessName(business.name);
    }
    if (preferences) {
      setCurrency(preferences.currency);
      setTimezone(preferences.timezone);
      setInactivityDays(preferences.inactivityThresholdDays);
      setRecoveryTarget(Math.round(preferences.recoveryRateTarget * 100));
      setAiTone(preferences.aiTonePreference);
    }
  }, [business, preferences]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;

    setIsSaving(true);
    setSaveStatus(null);

    try {
      if (businessName !== business?.name) {
        await updateBusiness({ name: businessName });
      }

      await updatePreferences({
        currency,
        timezone,
        inactivityThresholdDays: Number(inactivityDays),
        recoveryRateTarget: Number(recoveryTarget) / 100,
        aiTonePreference: aiTone,
      });

      setSaveStatus({
        type: "success",
        message: "Settings and AI preferences saved successfully.",
      });
    } catch (err: unknown) {
      setSaveStatus({
        type: "error",
        message:
          err instanceof Error ? err.message : "Failed to update settings.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-12 text-center text-sm text-zinc-500">
        Loading settings...
      </div>
    );
  }

  if (error || !business) {
    return (
      <div className="py-12 text-center text-sm text-red-600">
        {error || "Unable to load workspace settings."}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Workspace Settings & AI Preferences
        </h1>
        <p className="text-sm text-zinc-500">
          Configure customer churn qualifications and agent campaign behavior.
        </p>
      </div>

      {!canEdit ? (
        <Alert variant="info" title="Read Only">
          You are viewing this workspace as a <strong>MEMBER</strong>. Only
          Admins and Owners can modify workspace configuration.
        </Alert>
      ) : null}

      {saveStatus ? (
        <Alert variant={saveStatus.type}>{saveStatus.message}</Alert>
      ) : null}

      <form onSubmit={handleSave} className="space-y-6">
        <Card
          title="General Information"
          description="Workspace branding and identification"
        >
          <div className="space-y-4">
            <Input
              id="businessName"
              label="Workspace / Business Name"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              disabled={!canEdit || isSaving}
              required
            />
          </div>
        </Card>

        <Card
          title="Customer Recovery Rules"
          description="Define how the AI agent identifies inactive and recoverable customers"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="inactivityDays"
              type="number"
              label="Inactivity Threshold (Days)"
              helperText="Customers with no activity beyond this timeframe are flagged as inactive (7-365 days)."
              min={7}
              max={365}
              value={inactivityDays}
              onChange={(e) => setInactivityDays(Number(e.target.value))}
              disabled={!canEdit || isSaving}
              required
            />

            <Input
              id="recoveryTarget"
              type="number"
              label="Target Recovery Rate (%)"
              helperText="Benchmark success metric for AI reactivation campaigns (1-100%)."
              min={1}
              max={100}
              value={recoveryTarget}
              onChange={(e) => setRecoveryTarget(Number(e.target.value))}
              disabled={!canEdit || isSaving}
              required
            />

            <Input
              id="currency"
              label="Reporting Currency"
              helperText="3-letter currency code (e.g. USD, EUR, GBP)."
              maxLength={3}
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              disabled={!canEdit || isSaving}
              required
            />

            <Input
              id="timezone"
              label="Timezone"
              helperText="Timezone for scheduled campaign delivery (e.g. UTC, America/New_York)."
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              disabled={!canEdit || isSaving}
              required
            />
          </div>
        </Card>

        <Card
          title="AI Recovery Agent Tone"
          description="Personalization style for autonomous recovery copy generation"
        >
          <Select
            id="aiTone"
            label="Agent Voice & Personality"
            value={aiTone}
            onChange={(e) => setAiTone(e.target.value as AiTonePreference)}
            disabled={!canEdit || isSaving}
            options={[
              {
                label: "Professional — Polished, consultative, and value-focused",
                value: "professional",
              },
              {
                label: "Friendly — Warm, approachable, and relationship-centric",
                value: "friendly",
              },
              {
                label: "Urgent — Time-sensitive incentives and proactive follow-ups",
                value: "urgent",
              },
              {
                label: "Empathetic — Understanding churn reasons with feedback-first tone",
                value: "empathetic",
              },
            ]}
          />
        </Card>

        {canEdit ? (
          <div className="flex justify-end">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving changes..." : "Save Settings"}
            </Button>
          </div>
        ) : null}
      </form>
    </div>
  );
}
