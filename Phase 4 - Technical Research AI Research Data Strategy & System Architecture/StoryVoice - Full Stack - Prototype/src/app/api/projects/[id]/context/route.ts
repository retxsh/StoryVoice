import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth-helper";
import { StoryContextService } from "@/services/context";
import { logger } from "@/lib/logger";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const supabase = await createServerSupabaseClient();
    const user = await getAuthUser(supabase);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const items = await StoryContextService.listContextItems(projectId, user.id);
    return NextResponse.json({ items });
  } catch (err: unknown) {
    logger.error("API GET /api/projects/[id]/context error", err);
    return NextResponse.json({ error: "Failed to list context items" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const supabase = await createServerSupabaseClient();
    const user = await getAuthUser(supabase);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const item = await StoryContextService.createContextItem(user.id, projectId, {
      type: body.type || "Character",
      name: body.name,
      detail: body.detail,
      approved: body.approved ?? false,
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (err: unknown) {
    logger.error("API POST /api/projects/[id]/context error", err);
    return NextResponse.json({ error: "Failed to create context item" }, { status: 500 });
  }
}
