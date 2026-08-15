"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        throw new Error("Failed to request password reset.");
      }
      setSuccess(true);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Error requesting reset.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Card
          title="Reset your password"
          description="Enter your email and we'll send a password recovery link"
        >
          {success ? (
            <div className="mt-4 space-y-4">
              <Alert variant="success" title="Check your inbox">
                If an account matches that email address, instructions to reset
                your password have been sent.
              </Alert>
              <div className="text-center">
                <Link
                  href="/login"
                  className="text-sm font-medium text-zinc-900 underline hover:text-zinc-700"
                >
                  Return to sign in
                </Link>
              </div>
            </div>
          ) : (
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

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full justify-center"
              >
                {isLoading ? "Sending link..." : "Send Reset Link"}
              </Button>

              <p className="text-center text-xs text-zinc-600">
                Remembered your credentials?{" "}
                <Link
                  href="/login"
                  className="font-medium text-zinc-900 underline hover:text-zinc-700"
                >
                  Sign in
                </Link>
              </p>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
