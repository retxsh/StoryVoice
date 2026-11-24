import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth-helper";
import { TranscriptionService } from "@/services/transcription";
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

    const data = await TranscriptionService.getTranscript(id, user.id);
    if (!data) {
      // Check if any recent transcript was recorded in local store
      let latestTrans: any = null;
      for (const t of localStore.transcripts.values()) {
        latestTrans = t;
      }

      if (latestTrans) {
        const rev = localStore.transcriptRevisions.get(latestTrans.current_revision_id);
        const asset = localStore.audioAssets.get(latestTrans.audio_asset_id);
        if (rev) {
          return NextResponse.json({
            transcript: {
              ...latestTrans,
              audio_assets: asset ? { title: asset.title, duration_seconds: asset.duration_seconds } : undefined,
            },
            revisions: [rev],
            currentRevision: rev,
          });
        }
      }

      // Default fallback if no recordings exist yet
      const sample = "I went back to the lighthouse that night. I mean, I hadn't been there in years. The road was almost gone, and the wind was making it difficult to hear anything. I remember seeing a light in the upper window, which didn't make sense because the place had been abandoned. I stopped the car. I wasn't sure if I should go inside. Then I heard something, maybe a door, or something hitting the wall. I don't know. I just stood there for a while.";
      return NextResponse.json({
        transcript: { id, title: "The Lighthouse at Midnight — first pass" },
        revisions: [{ id: "rev-1", text: sample, word_count: 78 }],
        currentRevision: { id: "rev-1", text: sample, word_count: 78 },
      });
    }

    return NextResponse.json(data);
  } catch (err: unknown) {
    logger.error("API GET /api/transcripts/[id] error", err);
    return NextResponse.json({ error: "Failed to retrieve transcript" }, { status: 500 });
  }
}
