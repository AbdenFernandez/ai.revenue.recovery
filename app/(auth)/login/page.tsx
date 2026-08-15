"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";

export default function LoginPage() {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login({ email, password });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to log in.";
      setError(message);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Card
          title="Sign in to your account"
          description="Access your AI Revenue Recovery workspace"
        >
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {error ? <Alert variant="error">{error}</Alert> : null}

            <Input
              id="email"
              type="email"
              label="Email address"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />

            <div className="space-y-1">
              <Input
                id="password"
                type="password"
                label="Password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <div className="text-right">
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-zinc-600 hover:text-zinc-900"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full justify-center"
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-200 dark:border-zinc-800" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-zinc-500 dark:bg-zinc-900">
                  Or instant access
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="secondary"
              onClick={async () => {
                setError(null);
                try {
                  const res = await fetch("/api/auth/demo-login", { method: "POST" });
                  if (res.ok) {
                    window.location.href = "/dashboard";
                  }
                } catch {
                  setError("Failed to launch demo account.");
                }
              }}
              className="w-full justify-center border border-emerald-500/40 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-600/40 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
            >
              ⚡ 1-Click Demo Workspace
            </Button>


            <p className="text-center text-xs text-zinc-600">
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className="font-medium text-zinc-900 underline hover:text-zinc-700"
              >
                Create a workspace
              </Link>
            </p>
          </form>

        </Card>
      </div>
    </div>
  );
}
