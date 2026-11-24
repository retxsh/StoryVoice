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
    const { projectId, title, mimeType, fileSizeBytes, sourceType } = body;

    if (!projectId || !mimeType || !fileSizeBytes) {
      return NextResponse.json(
        { error: "Missing required fields: projectId, mimeType, fileSizeBytes" },
        { status: 400 }
      );
    }

    const result = await AudioService.requestUpload({
      userId: user.id,
      projectId,
      title: title || "Untitled Recording",
      mimeType,
      fileSizeBytes: Number(fileSizeBytes),
      sourceType: sourceType || "browser_recording",
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err: unknown) {
    logger.error("API POST /api/audio/request-upload error", err);
    const msg = err instanceof Error ? err.message : "Failed to request upload";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
