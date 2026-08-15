"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export default function HomePage() {
  const router = useRouter();
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);

  const handleDemoLogin = async () => {
    setIsDemoLoading(true);
    setDemoError(null);
    try {
      const res = await fetch("/api/auth/demo-login", {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to log in to demo.");
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      setDemoError(err instanceof Error ? err.message : "Error launching demo.");
      setIsDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 via-white to-zinc-100 text-zinc-900 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 dark:text-zinc-100">
      {/* Top Navigation */}
      <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/80 backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-950/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold shadow-sm shadow-emerald-500/20">
              ⚡
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                RecoverAI
              </span>
              <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                SaaS v1.0
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              isLoading={isDemoLoading}
              onClick={handleDemoLogin}
              className="border border-emerald-500/40 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:border-emerald-600/40 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
            >
              ⚡ 1-Click Demo
            </Button>
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Get Started Free →</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="mx-auto max-w-6xl px-4 pt-12 pb-20 sm:px-6 lg:pt-16">
        <div className="text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/80 px-3 py-1 text-xs font-medium text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            AI-Powered Revenue Recovery Platform
          </div>

          <h1 className="mx-auto max-w-4xl text-4xl font-extrabold tracking-tight text-zinc-900 sm:text-5xl lg:text-6xl dark:text-zinc-50">
            Turn Inactive &amp; At-Risk Customers into{" "}
            <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent dark:from-emerald-400 dark:via-teal-300 dark:to-cyan-400">
              Recovered Revenue
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-zinc-600 sm:text-lg dark:text-zinc-400">
            Continuous deterministic RFM intelligence, automated churn risk detection,
            and AI-driven multi-variant outreach designed to win back high-value customers with zero spam.
          </p>

          {/* Hero CTAs */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Button
              size="lg"
              isLoading={isDemoLoading}
              onClick={handleDemoLogin}
              className="bg-emerald-600 px-6 font-semibold shadow-md shadow-emerald-600/25 hover:bg-emerald-500"
            >
              ⚡ Launch Interactive Live Demo
            </Button>
            <Link href="/register">
              <Button variant="secondary" size="lg" className="px-6">
                Create New Workspace
              </Button>
            </Link>
          </div>


          {demoError ? (
            <p className="mt-3 text-xs text-red-500">{demoError}</p>
          ) : null}

          {/* Quick Demo Credentials pill */}
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <span>Demo Account:</span>
            <code className="rounded bg-zinc-200/80 px-2 py-0.5 font-mono text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
              demo@recovery.ai
            </code>
            <span>/</span>
            <code className="rounded bg-zinc-200/80 px-2 py-0.5 font-mono text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
              password123
            </code>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Card
            title="🎯 Revenue Intelligence Engine"
            description="Algorithmic RFM & Churn Modeling"
            className="hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
          >
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Deterministic scoring evaluates Recency, Frequency, and Monetary spend across 9 customer tiers
              (VIP, At Risk, Win Back, Dormant, Lost) with calculated recovery opportunity totals.
            </p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              <Badge variant="success">VIP Spend ($5k+)</Badge>
              <Badge variant="warning">At-Risk Detection</Badge>
              <Badge variant="info">Win-Back Potential</Badge>
            </div>
          </Card>

          <Card
            title="🤖 AI Campaign Studio"
            description="Multi-Variant Messaging & Strategy"
            className="hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
          >
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Generates targeted recovery campaigns with multi-variant copy tailored by tone (friendly, urgent, professional).
              Includes strict human-in-the-loop approval before anything is sent.
            </p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              <Badge variant="default">Structured Zod Output</Badge>
              <Badge variant="info">Variant A/B/C</Badge>
              <Badge variant="success">Human Review</Badge>
            </div>
          </Card>

          <Card
            title="📨 Resilient Email Channel"
            description="Rate-Limited Queue & Anti-Spam Gate"
            className="hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
          >
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Batch queue worker with rate limiting, exponential backoff retries, multi-tenant suppression list,
              unique idempotency keys, and cryptographic 1-click unsubscribe links.
            </p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              <Badge variant="success">1-Click Unsubscribe</Badge>
              <Badge variant="default">Idempotency Keys</Badge>
              <Badge variant="warning">Suppression List</Badge>
            </div>
          </Card>
        </div>

        {/* Live Workspace Preview CTA */}
        <div className="mt-12 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                Ready to explore the dashboard?
              </h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                The pre-seeded demo workspace includes 15 sample customer profiles, live RFM charts, AI campaign proposals, and delivery logs.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                size="lg"
                isLoading={isDemoLoading}
                onClick={handleDemoLogin}
                className="bg-emerald-600 font-medium hover:bg-emerald-500"
              >
                ⚡ Enter Demo Workspace →
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-zinc-50 py-8 text-center text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-500">
        <p>© 2026 AI Revenue Recovery Agent. Multi-tenant SaaS architecture.</p>
      </footer>
    </div>
  );
}
