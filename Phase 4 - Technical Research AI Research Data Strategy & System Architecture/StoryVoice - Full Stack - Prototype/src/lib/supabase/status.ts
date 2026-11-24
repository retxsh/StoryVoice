import { env } from "@/lib/env";

/**
 * Returns true if real, production-ready Supabase credentials are configured.
 * When false (e.g. initial setup, local development without live database, or test mocks),
 * services instantly utilize the in-memory/local canonical data store without waiting
 * for TCP network socket timeouts.
 */
export function isSupabaseConfigured(): boolean {
  const url = env.NEXT_PUBLIC_SUPABASE_URL || "";
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (
    url.includes("your-project") ||
    url.includes("127.0.0.1") ||
    url.includes("localhost") ||
    anonKey.includes("dummy") ||
    serviceKey.includes("dummy") ||
    anonKey === "your-anon-public-key" ||
    serviceKey === "your-service-role-private-key"
  ) {
    return false;
  }

  return true;
}
