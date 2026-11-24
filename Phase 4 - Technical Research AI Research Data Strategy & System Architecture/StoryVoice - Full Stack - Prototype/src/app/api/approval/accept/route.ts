import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth-helper";
import { ApprovalService } from "@/services/approval";
import { DraftAcceptanceSchema } from "@/types/domain";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const user = await getAuthUser(supabase);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rawBody = await request.json();
    const parsed = DraftAcceptanceSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid acceptance payload", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const result = await ApprovalService.acceptDraft(user.id, parsed.data);
    return NextResponse.json(result);
  } catch (err: unknown) {
    logger.error("API POST /api/approval/accept error", err);
    const msg = err instanceof Error ? err.message : "Acceptance transaction failed";
    const status = msg.includes("STALE_DRAFT_CONFLICT") ? 409 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
