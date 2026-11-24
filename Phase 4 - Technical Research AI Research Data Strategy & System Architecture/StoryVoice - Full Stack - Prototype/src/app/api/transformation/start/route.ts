import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth-helper";
import { TransformationService } from "@/services/transformation";
import { JobQueue } from "@/lib/queue";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const user = await getAuthUser(supabase);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, transcriptId, sourceRevisionId, mode, useContext } = body;

    if (!projectId || !mode) {
      return NextResponse.json(
        { error: "Missing required fields: projectId, mode" },
        { status: 400 }
      );
    }

    // Process transformation directly or via worker queue
    const result = await TransformationService.processDraftTransformation({
      userId: user.id,
      projectId,
      transcriptId: transcriptId || "trans-1",
      sourceRevisionId: sourceRevisionId || "rev-1",
      mode,
      useContext: !!useContext,
    });

    return NextResponse.json({
      jobId: result.draftId,
      draftId: result.draftId,
      status: "completed",
    }, { status: 200 });
  } catch (err: unknown) {
    logger.error("API POST /api/transformation/start error", err);
    return NextResponse.json({ error: "Failed to process transformation" }, { status: 500 });
  }
}
