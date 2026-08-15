"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";

export default function RegisterPage() {
  const { register, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await register({ email, password, fullName, businessName });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create account.";
      setError(message);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Card
          title="Create your account"
          description="Start recovering revenue with autonomous AI agent campaigns"
        >
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {error ? <Alert variant="error">{error}</Alert> : null}

            <Input
              id="fullName"
              type="text"
              label="Your Full Name"
              placeholder="Jane Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              autoComplete="name"
            />

            <Input
              id="businessName"
              type="text"
              label="Company or Workspace Name"
              placeholder="Acme Growth Inc."
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              required
            />

            <Input
              id="email"
              type="email"
              label="Work Email"
              placeholder="jane@acme.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />

            <Input
              id="password"
              type="password"
              label="Password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              helperText="Must be at least 8 characters with upper, lower, and digit."
              required
              autoComplete="new-password"
            />

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full justify-center"
            >
              {isLoading ? "Creating workspace..." : "Create Workspace"}
            </Button>

            <p className="text-center text-xs text-zinc-600">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-zinc-900 underline hover:text-zinc-700"
              >
                Sign in
              </Link>
            </p>
          </form>
        </Card>
      </div>
    </div>
  );
}
