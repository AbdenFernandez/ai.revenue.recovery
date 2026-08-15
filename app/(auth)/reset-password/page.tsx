"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to update password.");
      }
      setSuccess(true);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Error updating password.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Card
          title="Choose a new password"
          description="Enter your new secure password below"
        >
          {success ? (
            <div className="mt-4 space-y-4">
              <Alert variant="success" title="Password Updated">
                Your password has been reset successfully. You can now sign in
                with your new credentials.
              </Alert>
              <div className="text-center">
                <Link
                  href="/login"
                  className="text-sm font-medium text-zinc-900 underline hover:text-zinc-700"
                >
                  Go to Sign In
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {error ? <Alert variant="error">{error}</Alert> : null}

              <Input
                id="newPassword"
                type="password"
                label="New Password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                helperText="At least 8 characters with upper, lower, and digit."
                required
                autoComplete="new-password"
              />

              <Input
                id="confirmPassword"
                type="password"
                label="Confirm New Password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full justify-center"
              >
                {isLoading ? "Updating..." : "Update Password"}
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
