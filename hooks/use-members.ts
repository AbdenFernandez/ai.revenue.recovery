"use client";

import { useCallback, useEffect, useState } from "react";
import type { BusinessMember, UserRole } from "@/types/auth";
import type { AddMemberInput } from "@/schemas/business";

export function useMembers(businessId: string | null) {
  const [members, setMembers] = useState<BusinessMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    if (!businessId) {
      setMembers([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(`/api/businesses/${businessId}/members`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to load team members.");
      }
      setMembers(json.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error loading members.";
      setError(msg);
      setMembers([]);
    } finally {
      setIsLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    void fetchMembers();
  }, [fetchMembers]);

  const addMember = async (input: AddMemberInput) => {
    if (!businessId) return;
    try {
      const res = await fetch(`/api/businesses/${businessId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to add member.");
      }
      await fetchMembers();
      return json.data;
    } catch (err) {
      throw err;
    }
  };

  const updateRole = async (memberId: string, role: UserRole) => {
    if (!businessId) return;
    try {
      const res = await fetch(
        `/api/businesses/${businessId}/members/${memberId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role }),
        },
      );
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to update member role.");
      }
      await fetchMembers();
      return json.data;
    } catch (err) {
      throw err;
    }
  };

  const removeMember = async (memberId: string) => {
    if (!businessId) return;
    try {
      const res = await fetch(
        `/api/businesses/${businessId}/members/${memberId}`,
        {
          method: "DELETE",
        },
      );
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to remove member.");
      }
      await fetchMembers();
    } catch (err) {
      throw err;
    }
  };

  return {
    members,
    isLoading,
    error,
    addMember,
    updateRole,
    removeMember,
    reload: fetchMembers,
  };
}
