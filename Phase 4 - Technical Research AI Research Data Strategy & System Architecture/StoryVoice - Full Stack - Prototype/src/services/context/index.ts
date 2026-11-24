import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/status";
import { localStore } from "@/lib/local-store";
import { logger } from "@/lib/logger";
import { StoryContextItem } from "@/types/domain";

export class StoryContextService {
  static async listContextItems(projectId: string, userId: string): Promise<StoryContextItem[]> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = await createServerSupabaseClient();
        const { data } = await supabase
          .from("story_context_items")
          .select("*")
          .eq("project_id", projectId)
          .eq("user_id", userId)
          .order("created_at", { ascending: true });

        if (data && data.length > 0) {
          return data.map((row) => ({
            id: row.id,
            projectId: row.project_id,
            userId: row.user_id,
            type: row.type,
            name: row.name,
            detail: row.detail,
            approved: row.approved,
            origin: row.origin,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          }));
        }
      } catch {}
    }

    const local = Array.from(localStore.contextItems.values()).filter(
      (c) => c.project_id === projectId
    );

    return local.map((c) => ({
      id: c.id,
      projectId: c.project_id,
      userId: c.user_id,
      type: c.type,
      name: c.name,
      detail: c.detail,
      approved: c.approved,
      origin: c.origin,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    }));
  }

  static async getApprovedContext(projectId: string, userId: string): Promise<StoryContextItem[]> {
    const items = await this.listContextItems(projectId, userId);
    return items.filter((x) => x.approved);
  }

  static async createContextItem(
    userId: string,
    projectId: string,
    params: {
      type: "Character" | "Location" | "Terminology" | "Approved story fact" | "Suggestion";
      name: string;
      detail?: string;
      approved?: boolean;
    }
  ): Promise<StoryContextItem> {
    const itemId = crypto.randomUUID();

    if (isSupabaseConfigured()) {
      try {
        const supabase = await createServerSupabaseClient();
        const { data } = await supabase
          .from("story_context_items")
          .insert({
            id: itemId,
            project_id: projectId,
            user_id: userId,
            type: params.type,
            name: params.name.trim(),
            detail: params.detail?.trim() || "",
            approved: params.approved ?? false,
            origin: "writer_created",
          })
          .select("*")
          .single();

        if (data) {
          return {
            id: data.id,
            projectId: data.project_id,
            userId: data.user_id,
            type: data.type,
            name: data.name,
            detail: data.detail,
            approved: data.approved,
            origin: data.origin,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          };
        }
      } catch {}
    }

    const newItem = {
      id: itemId,
      project_id: projectId,
      user_id: userId,
      type: params.type,
      name: params.name.trim(),
      detail: params.detail?.trim() || "",
      approved: params.approved ?? false,
      origin: "writer_created" as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    localStore.contextItems.set(itemId, newItem);
    return {
      id: newItem.id,
      projectId: newItem.project_id,
      userId: newItem.user_id,
      type: newItem.type,
      name: newItem.name,
      detail: newItem.detail,
      approved: newItem.approved,
      origin: newItem.origin,
      createdAt: newItem.created_at,
      updatedAt: newItem.updated_at,
    };
  }

  static async updateContextItem(
    itemId: string,
    projectId: string,
    userId: string,
    params: {
      type?: "Character" | "Location" | "Terminology" | "Approved story fact" | "Suggestion";
      name?: string;
      detail?: string;
      approved?: boolean;
    }
  ): Promise<StoryContextItem> {
    const local = localStore.contextItems.get(itemId);
    if (local) {
      if (params.type !== undefined) local.type = params.type;
      if (params.name !== undefined) local.name = params.name.trim();
      if (params.detail !== undefined) local.detail = params.detail.trim();
      if (params.approved !== undefined) local.approved = params.approved;
      local.updated_at = new Date().toISOString();
      return {
        id: local.id,
        projectId: local.project_id,
        userId: local.user_id,
        type: local.type,
        name: local.name,
        detail: local.detail,
        approved: local.approved,
        origin: local.origin,
        createdAt: local.created_at,
        updatedAt: local.updated_at,
      };
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = await createServerSupabaseClient();
        const updatePayload: Record<string, unknown> = {
          updated_at: new Date().toISOString(),
        };

        if (params.type !== undefined) updatePayload.type = params.type;
        if (params.name !== undefined) updatePayload.name = params.name.trim();
        if (params.detail !== undefined) updatePayload.detail = params.detail.trim();
        if (params.approved !== undefined) updatePayload.approved = params.approved;

        const { data } = await supabase
          .from("story_context_items")
          .update(updatePayload)
          .eq("id", itemId)
          .eq("project_id", projectId)
          .eq("user_id", userId)
          .select("*")
          .single();

        if (data) {
          return {
            id: data.id,
            projectId: data.project_id,
            userId: data.user_id,
            type: data.type,
            name: data.name,
            detail: data.detail,
            approved: data.approved,
            origin: data.origin,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          };
        }
      } catch {}
    }

    throw new Error("Context item not found");
  }

  static async deleteContextItem(itemId: string, projectId: string, userId: string): Promise<void> {
    localStore.contextItems.delete(itemId);
    if (isSupabaseConfigured()) {
      try {
        const supabase = await createServerSupabaseClient();
        await supabase
          .from("story_context_items")
          .delete()
          .eq("id", itemId)
          .eq("project_id", projectId)
          .eq("user_id", userId);
      } catch {}
    }
  }

  static async listVocabularyTerms(projectId: string, userId: string): Promise<string[]> {
    const approved = await this.getApprovedContext(projectId, userId);
    return approved.map((x) => x.name);
  }
}
