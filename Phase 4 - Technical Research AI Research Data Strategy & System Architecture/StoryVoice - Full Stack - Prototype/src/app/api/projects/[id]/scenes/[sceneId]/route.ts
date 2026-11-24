import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth-helper";
import { SceneService } from "@/services/scene";
import { logger } from "@/lib/logger";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; sceneId: string }> }
) {
  try {
    const { id: projectId, sceneId } = await params;
    const supabase = await createServerSupabaseClient();
    const user = await getAuthUser(supabase);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const scene = await SceneService.getScene(sceneId, projectId, user.id);
    if (!scene) {
      return NextResponse.json({ error: "Scene not found" }, { status: 404 });
    }

    return NextResponse.json({ scene });
  } catch (err: unknown) {
    logger.error("API GET /api/projects/[id]/scenes/[sceneId] error", err);
    return NextResponse.json({ error: "Failed to fetch scene" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; sceneId: string }> }
) {
  try {
    const { id: projectId, sceneId } = await params;
    const supabase = await createServerSupabaseClient();
    const user = await getAuthUser(supabase);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const scene = await SceneService.updateScene(sceneId, projectId, user.id, body);
    return NextResponse.json({ scene });
  } catch (err: unknown) {
    logger.error("API PATCH /api/projects/[id]/scenes/[sceneId] error", err);
    return NextResponse.json({ error: "Failed to update scene" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; sceneId: string }> }
) {
  try {
    const { id: projectId, sceneId } = await params;
    const supabase = await createServerSupabaseClient();
    const user = await getAuthUser(supabase);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await SceneService.deleteScene(sceneId, projectId, user.id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    logger.error("API DELETE /api/projects/[id]/scenes/[sceneId] error", err);
    return NextResponse.json({ error: "Failed to delete scene" }, { status: 500 });
  }
}
