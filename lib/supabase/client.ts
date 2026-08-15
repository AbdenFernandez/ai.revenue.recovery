import { createBrowserClient } from "@supabase/ssr";
import { getClientConfig, isSupabaseConfigured } from "@/lib/config/client";

export function createSupabaseBrowserClient() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  const config = getClientConfig();

  return createBrowserClient(
    config.NEXT_PUBLIC_SUPABASE_URL!,
    config.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
