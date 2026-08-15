"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  CustomerOpportunity,
  OpportunitiesFilter,
  RevenueIntelligenceOverview,
} from "@/types/intelligence";

export function useIntelligence(businessId: string | null) {
  const [overview, setOverview] =
    useState<RevenueIntelligenceOverview | null>(null);
  const [opportunities, setOpportunities] = useState<CustomerOpportunity[]>([]);
  const [total, setTotal] = useState(0);
  const [totalEstimatedRevenue, setTotalEstimatedRevenue] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filters, setFilters] = useState<OpportunitiesFilter>({
    segment: "all",
    riskTier: "all",
    sortBy: "potentialRevenue",
    sortOrder: "desc",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = useCallback(async () => {
    if (!businessId) {
      setOverview(null);
      return;
    }
    try {
      const res = await fetch(`/api/businesses/${businessId}/intelligence/overview`);
      if (res.ok) {
        const json = await res.json();
        setOverview(json.data);
      }
    } catch {
      // Non-blocking
    }
  }, [businessId]);

  const fetchOpportunities = useCallback(async () => {
    if (!businessId) {
      setOpportunities([]);
      setTotal(0);
      setTotalEstimatedRevenue(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));

      if (filters.search) params.set("search", filters.search);
      if (filters.segment && filters.segment !== "all") {
        params.set("segment", filters.segment);
      }
      if (filters.riskTier && filters.riskTier !== "all") {
        params.set("riskTier", filters.riskTier);
      }
      if (filters.minPotentialRevenue !== undefined) {
        params.set("minPotentialRevenue", String(filters.minPotentialRevenue));
      }
      if (filters.sortBy) params.set("sortBy", filters.sortBy);
      if (filters.sortOrder) params.set("sortOrder", filters.sortOrder);

      const res = await fetch(
        `/api/businesses/${businessId}/intelligence/opportunities?${params.toString()}`,
      );
      const json = await res.json();

      if (!res.ok) {
        throw new Error(
          json.error?.message || "Failed to load revenue opportunities.",
        );
      }

      setOpportunities(json.data.items);
      setTotal(json.data.total);
      setTotalEstimatedRevenue(json.data.totalEstimatedRevenue);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error loading opportunities.",
      );
      setOpportunities([]);
    } finally {
      setIsLoading(false);
    }
  }, [businessId, page, pageSize, filters]);

  useEffect(() => {
    void fetchOverview();
    void fetchOpportunities();
  }, [fetchOverview, fetchOpportunities]);

  return {
    overview,
    opportunities,
    total,
    totalEstimatedRevenue,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
    filters,
    isLoading,
    error,
    setPage,
    setPageSize,
    setFilters,
    reload: () => {
      void fetchOverview();
      void fetchOpportunities();
    },
  };
}
