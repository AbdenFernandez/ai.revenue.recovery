import "server-only";

import { z } from "zod";

const serverEnvSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
    NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
    LOG_LEVEL: z
      .enum(["debug", "info", "warn", "error"])
      .default("info"),
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

    const hasServiceRole = Boolean(data.SUPABASE_SERVICE_ROLE_KEY);

    if (hasServiceRole && !hasUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "SUPABASE_SERVICE_ROLE_KEY requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
        path: ["SUPABASE_SERVICE_ROLE_KEY"],
      });
    }
  });

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedServerEnv: ServerEnv | undefined;

function parseServerEnv(): ServerEnv {
  return serverEnvSchema.parse({
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    LOG_LEVEL: process.env.LOG_LEVEL,
  });
}

/** Server-only configuration. Never import in client components. */
export function getServerConfig(): ServerEnv {
  if (!cachedServerEnv) {
    cachedServerEnv = parseServerEnv();
  }
  return cachedServerEnv;
}

/** @internal Test helper only. */
export function resetServerConfigForTests(): void {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("resetServerConfigForTests is only available in test mode.");
  }
  cachedServerEnv = undefined;
}
