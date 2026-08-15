"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  AudienceEstimation,
  Campaign,
  CampaignListFilters,
  CampaignWithDetails,
  CreateCampaignInput,
} from "@/types/campaign";
import type { CustomerSegment } from "@/types/intelligence";

export function useCampaigns(businessId?: string | null) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState<CampaignListFilters>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCampaigns = useCallback(async () => {
    if (!businessId) {
      setCampaigns([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", "10");
      if (filters.status) params.set("status", filters.status);
      if (filters.targetSegment) params.set("targetSegment", filters.targetSegment);
      if (filters.channel) params.set("channel", filters.channel);
      if (filters.search) params.set("search", filters.search);

      const res = await fetch(
        `/api/businesses/${businessId}/campaigns?${params.toString()}`,
      );
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to load campaigns.");
      }

      setCampaigns(json.items || []);
      setTotal(json.total || 0);
      setTotalPages(Math.max(1, Math.ceil((json.total || 0) / 10)));
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error loading campaigns.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [businessId, page, filters]);

  useEffect(() => {
    void fetchCampaigns();
  }, [fetchCampaigns]);

  // Actions
  const estimateAudience = async (
    segment: CustomerSegment,
  ): Promise<AudienceEstimation> => {
    if (!businessId) throw new Error("No active business selected.");

    const res = await fetch(
      `/api/businesses/${businessId}/campaigns/estimate-audience`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetSegment: segment }),
      },
    );

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || "Failed to estimate audience.");
    }
    return json.data;
  };

  const createCampaign = async (
    input: CreateCampaignInput,
  ): Promise<CampaignWithDetails> => {
    if (!businessId) throw new Error("No active business selected.");

    const res = await fetch(`/api/businesses/${businessId}/campaigns`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || "Failed to generate campaign.");
    }

    void fetchCampaigns();
    return json.data;
  };

  const approveCampaign = async (
    campaignId: string,
    approvedVariantId: string,
  ): Promise<CampaignWithDetails> => {
    if (!businessId) throw new Error("No active business selected.");

    const res = await fetch(
      `/api/businesses/${businessId}/campaigns/${campaignId}/approve`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvedVariantId }),
      },
    );

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || "Failed to approve campaign.");
    }

    void fetchCampaigns();
    return json.data;
  };

  const launchCampaign = async (
    campaignId: string,
  ): Promise<CampaignWithDetails> => {
    if (!businessId) throw new Error("No active business selected.");

    const res = await fetch(
      `/api/businesses/${businessId}/campaigns/${campaignId}/launch`,
      {
        method: "POST",
      },
    );

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || "Failed to launch campaign.");
    }

    void fetchCampaigns();
    return json.data;
  };

  const pauseCampaign = async (
    campaignId: string,
  ): Promise<CampaignWithDetails> => {
    if (!businessId) throw new Error("No active business selected.");

    const res = await fetch(
      `/api/businesses/${businessId}/campaigns/${campaignId}/pause`,
      {
        method: "POST",
      },
    );

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || "Failed to pause campaign.");
    }

    void fetchCampaigns();
    return json.data;
  };

  const resumeCampaign = async (
    campaignId: string,
  ): Promise<CampaignWithDetails> => {
    if (!businessId) throw new Error("No active business selected.");

    const res = await fetch(
      `/api/businesses/${businessId}/campaigns/${campaignId}/resume`,
      {
        method: "POST",
      },
    );

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || "Failed to resume campaign.");
    }

    void fetchCampaigns();
    return json.data;
  };

  return {
    campaigns,
    total,
    page,
    totalPages,
    filters,
    isLoading,
    error,
    setPage,
    setFilters,
    refetch: fetchCampaigns,
    estimateAudience,
    createCampaign,
    approveCampaign,
    launchCampaign,
    pauseCampaign,
    resumeCampaign,
  };
}
