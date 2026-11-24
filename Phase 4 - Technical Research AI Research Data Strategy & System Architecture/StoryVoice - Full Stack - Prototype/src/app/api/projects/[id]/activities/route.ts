import { NextRequest, NextResponse } from "next/server";
import { ActivityService } from "@/services/activity";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth-helper";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    let userId = "00000000-0000-0000-0000-000000000001";
    try {
      const supabase = await createServerSupabaseClient();
      const user = await getAuthUser(supabase);
      if (user?.id) userId = user.id;
    } catch {
      // Fallback to default user
    }

    const activities = await ActivityService.listActivities(projectId, userId);
    return NextResponse.json({ activities });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to list activities" },
      { status: 500 }
    );
  }
}
