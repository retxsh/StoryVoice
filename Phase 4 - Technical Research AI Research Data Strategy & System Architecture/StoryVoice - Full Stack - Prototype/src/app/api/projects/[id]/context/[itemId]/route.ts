import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth-helper";
import { StoryContextService } from "@/services/context";
import { logger } from "@/lib/logger";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id: projectId, itemId } = await params;
    const supabase = await createServerSupabaseClient();
    const user = await getAuthUser(supabase);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const item = await StoryContextService.updateContextItem(itemId, projectId, user.id, body);
    return NextResponse.json({ item });
  } catch (err: unknown) {
    logger.error("API PATCH /api/projects/[id]/context/[itemId] error", err);
    return NextResponse.json({ error: "Failed to update context item" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id: projectId, itemId } = await params;
    const supabase = await createServerSupabaseClient();
    const user = await getAuthUser(supabase);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await StoryContextService.deleteContextItem(itemId, projectId, user.id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    logger.error("API DELETE /api/projects/[id]/context/[itemId] error", err);
    return NextResponse.json({ error: "Failed to delete context item" }, { status: 500 });
  }
}
