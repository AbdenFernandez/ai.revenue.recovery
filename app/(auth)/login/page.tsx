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
