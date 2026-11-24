import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/status";
import { getAuthUser } from "@/lib/auth-helper";
import { AudioService } from "@/services/audio";
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

    const localAsset = localStore.audioAssets.get(id);
    if (localAsset) {
      return NextResponse.json({
        asset: localAsset,
        playbackUrl: null,
      });
    }

    if (isSupabaseConfigured()) {
      const { data: asset } = await supabase
        .from("audio_assets")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (asset) {
        const playbackUrl = await AudioService.getPlaybackUrl(id, user.id);
        return NextResponse.json({
          asset,
          playbackUrl,
        });
      }
    }

    return NextResponse.json({ error: "Audio asset not found" }, { status: 404 });
  } catch (err: unknown) {
    logger.error("API GET /api/audio/[id] error", err);
    return NextResponse.json({ error: "Failed to retrieve audio asset" }, { status: 500 });
  }
}
