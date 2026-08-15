import { appMetadata, isSupabaseConfigured } from "@/lib/config";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function HomePage() {
  const supabaseReady = isSupabaseConfigured();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-12 sm:px-6 lg:px-8">
      <section className="space-y-4">
        <Badge variant="info">Phase 0 — Foundation</Badge>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
          {appMetadata.name}
        </h1>
        <p className="max-w-2xl text-base leading-7 text-zinc-600 sm:text-lg">
          {appMetadata.description}
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Card title="Application status" description="Core platform scaffold">
          <ul className="space-y-2 text-sm text-zinc-700">
            <li>Next.js App Router with TypeScript (strict)</li>
            <li>Service, repository, and schema layers</li>
            <li>Supabase-compatible PostgreSQL architecture</li>
            <li>Zod validation and structured error handling</li>
          </ul>
        </Card>

        <Card title="Environment" description="Integration readiness">
          <p className="text-sm text-zinc-700">
            Supabase configuration:{" "}
            <span
              className={
                supabaseReady
                  ? "font-medium text-emerald-700"
                  : "font-medium text-amber-700"
              }
            >
              {supabaseReady ? "Configured" : "Not configured (development OK)"}
            </span>
          </p>
          <p className="mt-3 text-sm text-zinc-600">
            Copy <code className="rounded bg-zinc-100 px-1">.env.example</code>{" "}
            to <code className="rounded bg-zinc-100 px-1">.env.local</code> and
            add your Supabase credentials when ready.
          </p>
        </Card>
      </section>
    </div>
  );
}
