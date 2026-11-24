import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth-helper";
import { AudioService } from "@/services/audio";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const user = await getAuthUser(supabase);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { audioAssetId, clientTranscript, durationSeconds, afterSceneId } = body;

    if (!audioAssetId) {
      return NextResponse.json({ error: "audioAssetId is required" }, { status: 400 });
    }

    const result = await AudioService.confirmUpload(audioAssetId, user.id, {
      clientTranscript,
      durationSeconds: typeof durationSeconds === "number" ? durationSeconds : undefined,
      afterSceneId: typeof afterSceneId === "string" ? afterSceneId : undefined,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    logger.error("API POST /api/audio/confirm-upload error", err);
    const msg = err instanceof Error ? err.message : "Failed to confirm upload";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
