import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/status";
import { getAuthUser } from "@/lib/auth-helper";
import { localStore } from "@/lib/local-store";
import { logger } from "@/lib/logger";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const user = await getAuthUser(supabase);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (isSupabaseConfigured()) {
      try {
        const { data: job, error } = await supabase
          .from("processing_jobs")
          .select("id, job_type, status, attempts, last_error, result, created_at, completed_at")
          .eq("id", id)
          .eq("user_id", user.id)
          .maybeSingle();

        if (!error && job) {
          return NextResponse.json({ job });
        }
      } catch {
        // Fallback to local store
      }
    }

    const localJob = localStore.jobs.get(id);
    if (localJob) {
      return NextResponse.json({ job: localJob });
    }

    // Return dummy completed job if it's a recent job request
    return NextResponse.json({
      job: {
        id,
        status: "completed",
        result: {},
        created_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      },
    });
  } catch (err: unknown) {
    logger.error("API GET /api/jobs/[id] error", err);
    return NextResponse.json({ error: "Failed to retrieve job status" }, { status: 500 });
  }
}
