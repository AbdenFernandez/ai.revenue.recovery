"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  Customer,
  CustomerFilters,
  CustomerStats,
  ImportExecutionResult,
  ImportPreviewResult,
  CsvColumnMapping,
} from "@/types/customer";
import type {
  CreateCustomerInput,
  UpdateCustomerInput,
} from "@/schemas/customer";

export function useCustomers(businessId: string | null) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filters, setFilters] = useState<CustomerFilters>({
    status: "all",
    sortBy: "createdAt",
    sortOrder: "desc",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!businessId) return;
    try {
      const res = await fetch(`/api/businesses/${businessId}/customers/stats`);
      if (res.ok) {
        const json = await res.json();
        setStats(json.data);
      }
    } catch {
      // Non-critical, ignore
    }
  }, [businessId]);

  const fetchCustomers = useCallback(async () => {
    if (!businessId) {
      setCustomers([]);
      setTotal(0);
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
      if (filters.status && filters.status !== "all") {
        params.set("status", filters.status);
      }
      if (filters.serviceType) params.set("serviceType", filters.serviceType);
      if (filters.sortBy) params.set("sortBy", filters.sortBy);
      if (filters.sortOrder) params.set("sortOrder", filters.sortOrder);
      if (filters.minAmount !== undefined) {
        params.set("minAmount", String(filters.minAmount));
      }
      if (filters.maxAmount !== undefined) {
        params.set("maxAmount", String(filters.maxAmount));
      }

      const res = await fetch(
        `/api/businesses/${businessId}/customers?${params.toString()}`,
      );
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to load customers.");
      }

      setCustomers(json.data.items);
      setTotal(json.data.total);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Error loading customers.";
      setError(msg);
      setCustomers([]);
    } finally {
      setIsLoading(false);
    }
  }, [businessId, page, pageSize, filters]);

  useEffect(() => {
    void fetchCustomers();
    void fetchStats();
  }, [fetchCustomers, fetchStats]);

  const createCustomer = async (input: CreateCustomerInput) => {
    if (!businessId) return;
    const res = await fetch(`/api/businesses/${businessId}/customers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || "Failed to create customer.");
    }
    await fetchCustomers();
    await fetchStats();
    return json.data as Customer;
  };

  const updateCustomer = async (
    customerId: string,
    input: UpdateCustomerInput,
  ) => {
    if (!businessId) return;
    const res = await fetch(
      `/api/businesses/${businessId}/customers/${customerId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      },
    );
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || "Failed to update customer.");
    }
    await fetchCustomers();
    await fetchStats();
    return json.data as Customer;
  };

  const deleteCustomer = async (customerId: string) => {
    if (!businessId) return;
    const res = await fetch(
      `/api/businesses/${businessId}/customers/${customerId}`,
      {
        method: "DELETE",
      },
    );
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || "Failed to delete customer.");
    }
    await fetchCustomers();
    await fetchStats();
  };

  const previewImport = async (
    csvText: string,
    mapping?: CsvColumnMapping,
  ): Promise<ImportPreviewResult> => {
    if (!businessId) throw new Error("No active workspace.");
    const res = await fetch(
      `/api/businesses/${businessId}/customers/import/preview`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvText, mapping }),
      },
    );
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || "CSV preview failed.");
    }
    return json.data as ImportPreviewResult;
  };

  const executeImport = async (
    rows: CreateCustomerInput[],
  ): Promise<ImportExecutionResult> => {
    if (!businessId) throw new Error("No active workspace.");
    const res = await fetch(
      `/api/businesses/${businessId}/customers/import/execute`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      },
    );
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || "Bulk import failed.");
    }
    await fetchCustomers();
    await fetchStats();
    return json.data as ImportExecutionResult;
  };

  const exportCsvUrl = businessId
    ? `/api/businesses/${businessId}/customers/export?${new URLSearchParams(
        filters as Record<string, string>,
      ).toString()}`
    : "#";

  return {
    customers,
    stats,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
    filters,
    isLoading,
    error,
    setPage,
    setPageSize,
    setFilters,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    previewImport,
    executeImport,
    exportCsvUrl,
    reload: () => {
      void fetchCustomers();
      void fetchStats();
    },
  };
}
