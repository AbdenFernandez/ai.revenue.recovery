"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { AuthSession, UserRole } from "@/types/auth";
import type { LoginInput, RegisterInput } from "@/schemas/auth";

export function useAuth() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSession = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const json = (await res.json()) as { data: AuthSession };
        setSession(json.data);
      } else {
        setSession(null);
      }
    } catch {
      setSession(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSession();
  }, [fetchSession]);

  const login = async (input: LoginInput) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Login failed.");
      }
      setSession(json.data);
      router.push("/dashboard");
      return json.data;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to log in.";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (input: RegisterInput) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Registration failed.");
      }
      setSession(json.data);
      router.push("/dashboard");
      return json.data;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create account.";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setSession(null);
      router.push("/login");
    }
  };

  const switchBusiness = async (businessId: string) => {
    if (!session) return;
    const target = session.memberships.find((m) => m.businessId === businessId);
    if (!target) return;

    // Update profile default business
    await fetch("/api/auth/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ defaultBusinessId: businessId }),
    });

    await fetchSession();
    router.refresh();
  };

  const activeMembership = session?.memberships.find(
    (m) => m.businessId === session.activeBusinessId,
  );

  return {
    session,
    user: session?.user ?? null,
    memberships: session?.memberships ?? [],
    activeBusinessId: session?.activeBusinessId ?? null,
    activeRole: (activeMembership?.role as UserRole) ?? null,
    isLoading,
    error,
    login,
    register,
    logout,
    switchBusiness,
    refreshSession: fetchSession,
  };
}
