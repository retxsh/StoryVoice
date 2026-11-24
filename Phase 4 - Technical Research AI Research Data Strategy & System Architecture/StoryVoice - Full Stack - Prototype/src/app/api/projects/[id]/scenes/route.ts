import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth-helper";
import { SceneService } from "@/services/scene";
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

    const scenes = await SceneService.listScenes(projectId, user.id);
    return NextResponse.json({ scenes });
  } catch (err: unknown) {
    logger.error("API GET /api/projects/[id]/scenes error", err);
    return NextResponse.json({ error: "Failed to list scenes" }, { status: 500 });
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
    const scene = await SceneService.createScene(user.id, projectId, {
      title: body.title || "Untitled Scene",
      description: body.description,
      canonicalText: body.canonicalText,
    });

    return NextResponse.json({ scene }, { status: 201 });
  } catch (err: unknown) {
    logger.error("API POST /api/projects/[id]/scenes error", err);
    return NextResponse.json({ error: "Failed to create scene" }, { status: 500 });
  }
}
