import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getClientConfig,
  resetClientConfigForTests,
} from "@/lib/config/client";
import {
  getServerConfig,
  resetServerConfigForTests,
} from "@/lib/config/server";

const trackedKeys = [
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "LOG_LEVEL",
  "NODE_ENV",
] as const;

describe("config validation", () => {
  const originalEnv = Object.fromEntries(
    trackedKeys.map((key) => [key, process.env[key]]),
  );

  beforeEach(() => {
    resetClientConfigForTests();
    resetServerConfigForTests();
  });

  afterEach(() => {
    const env = process.env as Record<string, string | undefined>;
    for (const key of trackedKeys) {
      const value = originalEnv[key];
      if (value === undefined) {
        delete env[key];
      } else {
        env[key] = value;
      }
    }

    resetClientConfigForTests();
    resetServerConfigForTests();
  });


  it("accepts when Supabase public vars are both omitted", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    expect(() => getClientConfig()).not.toThrow();
    expect(() => getServerConfig()).not.toThrow();
  });

  it("accepts when Supabase public vars are both set", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";

    expect(() => getClientConfig()).not.toThrow();
    expect(() => getServerConfig()).not.toThrow();
  });

  it("rejects partial Supabase public configuration", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    expect(() => getClientConfig()).toThrow();
  });

  it("rejects service role key without Supabase public configuration", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

    expect(() => getServerConfig()).toThrow();
  });
});
