import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Privileged Supabase Admin Client.
 * Bypasses Row Level Security (RLS).
 * MUST ONLY be used in server-side background workers and internal system tasks.
 * NEVER expose to client components or public route handlers without manual authorization!
 */
export function createAdminClient() {
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
