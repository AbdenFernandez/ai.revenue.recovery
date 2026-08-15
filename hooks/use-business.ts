"use client";

import { useCallback, useEffect, useState } from "react";
import type { BusinessContext } from "@/types/auth";
import type { UpdateBusinessInput, UpdatePreferencesInput } from "@/schemas/business";

export function useBusiness(businessId: string | null) {
  const [context, setContext] = useState<BusinessContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContext = useCallback(async () => {
    if (!businessId) {
      setContext(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(`/api/businesses/${businessId}`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to load workspace data.");
      }
      setContext(json.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error loading business.";
      setError(msg);
      setContext(null);
    } finally {
      setIsLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    void fetchContext();
  }, [fetchContext]);

  const updateBusiness = async (input: UpdateBusinessInput) => {
    if (!businessId) return;
    try {
      const res = await fetch(`/api/businesses/${businessId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to update business.");
      }
      await fetchContext();
      return json.data;
    } catch (err) {
      throw err;
    }
  };

  const updatePreferences = async (input: UpdatePreferencesInput) => {
    if (!businessId) return;
    try {
      const res = await fetch(`/api/businesses/${businessId}/preferences`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(
          json.error?.message || "Failed to update recovery preferences.",
        );
      }
      await fetchContext();
      return json.data;
    } catch (err) {
      throw err;
    }
  };

  return {
    context,
    business: context?.business ?? null,
    membership: context?.membership ?? null,
    subscription: context?.subscription ?? null,
    preferences: context?.preferences ?? null,
    role: context?.membership?.role ?? null,
    isLoading,
    error,
    updateBusiness,
    updatePreferences,
    reload: fetchContext,
  };
}
