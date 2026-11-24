import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth-helper";
import { TransformationService } from "@/services/transformation";
import { localStore } from "@/lib/local-store";
import { logger } from "@/lib/logger";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const requestedMode = url.searchParams.get("mode") || undefined;

    const supabase = await createServerSupabaseClient();
    const user = await getAuthUser(supabase);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await TransformationService.getDraft(id, user.id, requestedMode);
    if (!data) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err: unknown) {
    logger.error("API GET /api/drafts/[id] error", err);
    return NextResponse.json({ error: "Failed to retrieve draft" }, { status: 500 });
  }
}
