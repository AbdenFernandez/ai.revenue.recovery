import { z } from "zod";

const clientEnvSchema = z
  .object({
    NEXT_PUBLIC_APP_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  })
  .superRefine((data, ctx) => {
    const hasUrl = Boolean(data.NEXT_PUBLIC_SUPABASE_URL);
    const hasKey = Boolean(data.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    if (hasUrl !== hasKey) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must both be set or both omitted.",
        path: ["NEXT_PUBLIC_SUPABASE_URL"],
      });
    }
  });

export type ClientEnv = z.infer<typeof clientEnvSchema>;

let cachedClientEnv: ClientEnv | undefined;

function parseClientEnv(): ClientEnv {
  return clientEnvSchema.parse({
    NEXT_PUBLIC_APP_URL:
      process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}

/** Public configuration safe for browser usage. */
export function getClientConfig(): ClientEnv {
  if (!cachedClientEnv) {
    cachedClientEnv = parseClientEnv();
  }
  return cachedClientEnv;
}

export function isSupabaseConfigured(): boolean {
  const config = getClientConfig();
  return Boolean(
    config.NEXT_PUBLIC_SUPABASE_URL && config.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/** @internal Test helper only. */
export function resetClientConfigForTests(): void {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("resetClientConfigForTests is only available in test mode.");
  }
  cachedClientEnv = undefined;
}
