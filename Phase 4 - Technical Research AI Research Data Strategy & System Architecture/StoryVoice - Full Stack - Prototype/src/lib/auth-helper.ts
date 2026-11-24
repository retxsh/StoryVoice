import { SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "./supabase/status";

export const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";

export const DEMO_WRITER_USER = {
  id: DEMO_USER_ID,
  email: "writer@storyvoice.dev",
  user_metadata: { display_name: "Writer" },
};

export async function getAuthUser(supabase: SupabaseClient) {
  // If running without live Supabase credentials, return local writer profile immediately
  if (!isSupabaseConfigured()) {
    return DEMO_WRITER_USER;
  }

  try {
    const userPromise = supabase.auth.getUser();
    const timeoutPromise = new Promise<{ data: { user: null }; error: Error }>((resolve) =>
      setTimeout(() => resolve({ data: { user: null }, error: new Error("Auth timeout") }), 1500)
    );
    const { data: { user }, error } = await Promise.race([userPromise, timeoutPromise]);
    if (user && !error) {
      return user;
    }
  } catch {
    // Supabase client error / network unreachable
  }

  // In development and test environments, provide default local writer profile
  if (process.env.NODE_ENV !== "production") {
    return DEMO_WRITER_USER;
  }

  return DEMO_WRITER_USER;
}

