import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export class AuditService {
  static async recordEvent(params: {
    userId: string;
    projectId?: string;
    eventType: string;
    entityType: string;
    entityId: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    try {
      const supabase = await createServerSupabaseClient();
      await supabase.from("audit_events").insert({
        user_id: params.userId,
        project_id: params.projectId || null,
        event_type: params.eventType,
        entity_type: params.entityType,
        entity_id: params.entityId,
        metadata: (params.metadata || {}) as any,
      });
    } catch (err) {
      // Non-blocking for primary user journey, but logged
      logger.warn("Failed recording audit event", { ...params, error: String(err) });
    }
  }
}
