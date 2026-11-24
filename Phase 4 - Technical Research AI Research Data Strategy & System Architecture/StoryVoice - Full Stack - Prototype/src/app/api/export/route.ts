import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth-helper";
import { ExportService } from "@/services/export";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const user = await getAuthUser(supabase);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, scope, sceneId, sceneIds, format } = body;

    if (!projectId || !scope || !format) {
      return NextResponse.json(
        { error: "Missing required fields: projectId, scope, format" },
        { status: 400 }
      );
    }

    if (!["docx", "md", "txt"].includes(format)) {
      return NextResponse.json({ error: `Invalid export format: ${format}` }, { status: 400 });
    }

    const result = await ExportService.generateExport({
      userId: user.id,
      projectId,
      scope: scope || "scene",
      sceneId,
      sceneIds: Array.isArray(sceneIds) ? sceneIds : undefined,
      format,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err: unknown) {
    logger.error("API POST /api/export error", err);
    const msg = err instanceof Error ? err.message : "Export failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
