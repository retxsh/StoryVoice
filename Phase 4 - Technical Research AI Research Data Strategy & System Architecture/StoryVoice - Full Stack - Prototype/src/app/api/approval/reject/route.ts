import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth-helper";
import { ApprovalService } from "@/services/approval";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const user = await getAuthUser(supabase);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    if (!body.draftId) {
      return NextResponse.json({ error: "draftId is required" }, { status: 400 });
    }

    await ApprovalService.rejectDraft(user.id, body.draftId);
    return NextResponse.json({ success: true, rejected: true });
  } catch (err: unknown) {
    logger.error("API POST /api/approval/reject error", err);
    return NextResponse.json({ error: "Failed to reject draft" }, { status: 500 });
  }
}
