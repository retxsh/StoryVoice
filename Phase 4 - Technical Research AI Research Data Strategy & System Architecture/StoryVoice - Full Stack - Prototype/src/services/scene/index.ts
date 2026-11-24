import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/status";
import { localStore } from "@/lib/local-store";
import { logger } from "@/lib/logger";
import { Scene } from "@/types/domain";

export class SceneService {
  static async listScenes(projectId: string, userId: string): Promise<Scene[]> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = await createServerSupabaseClient();
        const { data } = await supabase
          .from("scenes")
          .select("*")
          .eq("project_id", projectId)
          .eq("user_id", userId)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true });

        if (data && data.length > 0) {
          return data.map((row) => ({
            id: row.id,
            projectId: row.project_id,
            userId: row.user_id,
            title: row.title,
            description: row.description,
            canonicalText: row.canonical_text,
            wordCount: row.word_count,
            sortOrder: row.sort_order,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          }));
        }
      } catch {}
    }

    // Check localStore
    let local = Array.from(localStore.scenes.values()).filter(
      (s) => s.project_id === projectId
    );

    if (local.length === 0) {
      localStore.seedDefaultScenes(projectId, userId);
      local = Array.from(localStore.scenes.values()).filter(
        (s) => s.project_id === projectId
      );
    }

    local.sort((a, b) => a.sort_order - b.sort_order);

    return local.map((s) => ({
      id: s.id,
      projectId: s.project_id,
      userId: s.user_id,
      title: s.title,
      description: s.description,
      canonicalText: s.canonical_text,
      wordCount: s.word_count,
      sortOrder: s.sort_order,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
    }));
  }

  static async getScene(sceneId: string, projectId: string, userId: string): Promise<Scene | null> {
    if (localStore.scenes.size === 0) {
      localStore.seedDefaultScenes(projectId, userId);
    }

    const local = localStore.scenes.get(sceneId);
    if (local) {
      return {
        id: local.id,
        projectId: local.project_id,
        userId: local.user_id,
        title: local.title,
        description: local.description,
        canonicalText: local.canonical_text,
        wordCount: local.word_count,
        sortOrder: local.sort_order,
        createdAt: local.created_at,
        updatedAt: local.updated_at,
      };
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = await createServerSupabaseClient();
        const { data } = await supabase
          .from("scenes")
          .select("*")
          .eq("id", sceneId)
          .eq("project_id", projectId)
          .eq("user_id", userId)
          .maybeSingle();

        if (data) {
          return {
            id: data.id,
            projectId: data.project_id,
            userId: data.user_id,
            title: data.title,
            description: data.description,
            canonicalText: data.canonical_text,
            wordCount: data.word_count,
            sortOrder: data.sort_order,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          };
        }
      } catch {}
    }

    return null;
  }

  static async createScene(
    userId: string,
    projectId: string,
    params: { title: string; description?: string; canonicalText?: string }
  ): Promise<Scene> {
    const text = params.canonicalText || "";
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const sceneId = crypto.randomUUID();

    if (isSupabaseConfigured()) {
      try {
        const supabase = await createServerSupabaseClient();
        const { data } = await supabase
          .from("scenes")
          .insert({
            id: sceneId,
            project_id: projectId,
            user_id: userId,
            title: params.title.trim() || "Untitled Scene",
            description: params.description?.trim() || null,
            canonical_text: text,
            word_count: words,
          })
          .select("*")
          .single();

        if (data) {
          return {
            id: data.id,
            projectId: data.project_id,
            userId: data.user_id,
            title: data.title,
            description: data.description,
            canonicalText: data.canonical_text,
            wordCount: data.word_count,
            sortOrder: data.sort_order,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          };
        }
      } catch {}
    }

    // Fallback in localStore
    const newScene = {
      id: sceneId,
      project_id: projectId,
      user_id: userId,
      title: params.title.trim() || "Untitled Scene",
      description: params.description?.trim() || null,
      canonical_text: text,
      word_count: words,
      sort_order: localStore.scenes.size + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    localStore.scenes.set(sceneId, newScene);
    return {
      id: newScene.id,
      projectId: newScene.project_id,
      userId: newScene.user_id,
      title: newScene.title,
      description: newScene.description,
      canonicalText: newScene.canonical_text,
      wordCount: newScene.word_count,
      sortOrder: newScene.sort_order,
      createdAt: newScene.created_at,
      updatedAt: newScene.updated_at,
    };
  }

  static async updateScene(
    sceneId: string,
    projectId: string,
    userId: string,
    params: { title?: string; description?: string; canonicalText?: string }
  ): Promise<Scene> {
    const local = localStore.scenes.get(sceneId);
    if (local) {
      if (params.title !== undefined) local.title = params.title.trim();
      if (params.description !== undefined) local.description = params.description?.trim() || null;
      if (params.canonicalText !== undefined) {
        local.canonical_text = params.canonicalText;
        local.word_count = params.canonicalText.trim().split(/\s+/).length;
      }
      local.updated_at = new Date().toISOString();
      return {
        id: local.id,
        projectId: local.project_id,
        userId: local.user_id,
        title: local.title,
        description: local.description,
        canonicalText: local.canonical_text,
        wordCount: local.word_count,
        sortOrder: local.sort_order,
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

        if (params.title !== undefined) updatePayload.title = params.title.trim();
        if (params.description !== undefined) updatePayload.description = params.description?.trim() || null;
        if (params.canonicalText !== undefined) {
          updatePayload.canonical_text = params.canonicalText;
          updatePayload.word_count = params.canonicalText.trim().split(/\s+/).length;
        }

        const { data } = await supabase
          .from("scenes")
          .update(updatePayload)
          .eq("id", sceneId)
          .eq("project_id", projectId)
          .eq("user_id", userId)
          .select("*")
          .single();

        if (data) {
          return {
            id: data.id,
            projectId: data.project_id,
            userId: data.user_id,
            title: data.title,
            description: data.description,
            canonicalText: data.canonical_text,
            wordCount: data.word_count,
            sortOrder: data.sort_order,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          };
        }
      } catch {}
    }

    throw new Error("Scene not found");
  }

  static async deleteScene(sceneId: string, projectId: string, userId: string): Promise<void> {
    localStore.scenes.delete(sceneId);
    if (isSupabaseConfigured()) {
      try {
        const supabase = await createServerSupabaseClient();
        await supabase
          .from("scenes")
          .delete()
          .eq("id", sceneId)
          .eq("project_id", projectId)
          .eq("user_id", userId);
      } catch {}
    }
  }
}
