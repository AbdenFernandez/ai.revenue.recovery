"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [unsubscribedEmail, setUnsubscribedEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const handleUnsubscribe = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!token) {
      setError("No unsubscribe token provided. Link may be invalid.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          reason: reason || "User 1-click unsubscribe",
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(
          json.error?.message || "Failed to process unsubscribe request.",
        );
      }

      setIsSuccess(true);
      setUnsubscribedEmail(json.data?.email || "your email address");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error processing unsubscribe.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-trigger unsubscribe on landing if token is present
  useEffect(() => {
    if (!token) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    fetch("/api/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, reason: "User 1-click unsubscribe" }),
    })
      .then((res) => res.json())
      .then((json) => {
        if (isMounted) {
          if (json.data) {
            setIsSuccess(true);
            setUnsubscribedEmail(json.data.email || "your email address");
          } else {
            setError(
              json.error?.message || "Failed to process unsubscribe request.",
            );
          }
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Error processing unsubscribe.",
          );
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [token]);


  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4 dark:bg-zinc-950">
      <div className="w-full max-w-md">
        <Card className="p-6">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
              <span className="text-2xl">📭</span>
            </div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              Email Preferences
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Manage your email subscription status
            </p>
          </div>

          <div className="mt-6 space-y-4">
            {error ? (
              <Alert variant="error">
                {error}
              </Alert>
            ) : null}

            {isSuccess ? (
              <div className="space-y-4 text-center">
                <div className="rounded-lg bg-emerald-50 p-4 dark:bg-emerald-950/40">
                  <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                    ✓ You have been unsubscribed
                  </p>
                  <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
                    <strong>{unsubscribedEmail}</strong> will no longer receive automated recovery or campaign emails.
                  </p>
                </div>

                <p className="text-xs text-zinc-500">
                  Changed your mind or unsubscribed by mistake? Contact the sender directly to reactivate communications.
                </p>
              </div>
            ) : isLoading ? (
              <div className="py-8 text-center text-sm text-zinc-500">
                Processing your unsubscribe request...
              </div>
            ) : (
              <form onSubmit={handleUnsubscribe} className="space-y-4">
                <div>
                  <label
                    htmlFor="reason"
                    className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    Reason for unsubscribing (optional)
                  </label>
                  <textarea
                    id="reason"
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Too frequent, no longer relevant, etc."
                    className="mt-1 block w-full rounded-md border border-zinc-300 bg-white p-2.5 text-xs text-zinc-900 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </div>

                <Button
                  type="submit"
                  variant="danger"
                  className="w-full"
                  disabled={isLoading || !token}
                >

                  {isLoading ? "Unsubscribing..." : "Confirm Unsubscribe"}
                </Button>
              </form>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4 text-sm text-zinc-500 dark:bg-zinc-950">
          Loading preferences...
        </div>
      }
    >
      <UnsubscribeContent />
    </Suspense>
  );
}
