import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth-helper";
import { ProjectService } from "@/services/project";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const user = await getAuthUser(supabase);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const projects = await ProjectService.listUserProjects(user.id);
    return NextResponse.json({ projects });
  } catch (err: unknown) {
    logger.error("API GET /api/projects error", err);
    return NextResponse.json({ error: "Failed to retrieve projects" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const user = await getAuthUser(supabase);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const project = await ProjectService.createProject(user.id, {
      title: body.title,
      genre: body.genre,
      description: body.description,
      notes: body.notes,
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (err: unknown) {
    logger.error("API POST /api/projects error", err);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}
