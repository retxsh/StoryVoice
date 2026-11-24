import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth-helper";
import { TransformationService } from "@/services/transformation";
import { logger } from "@/lib/logger";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const user = await getAuthUser(supabase);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    if (!body.text || typeof body.text !== "string") {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const revision = await TransformationService.createDraftRevision(
      id,
      user.id,
      body.text,
      body.authorType || "writer_edit",
      body.editSummary
    );

    return NextResponse.json({ revision }, { status: 201 });
  } catch (err: unknown) {
    logger.error("API POST /api/drafts/[id]/revisions error", err);
    return NextResponse.json({ error: "Failed to create draft revision" }, { status: 500 });
  }
}
