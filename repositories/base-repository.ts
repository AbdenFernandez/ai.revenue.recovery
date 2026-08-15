import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Base repository contract for tenant-scoped data access.
 * Concrete repositories will enforce tenant isolation at query time.
 */
export abstract class BaseRepository {
  protected readonly client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }
}
