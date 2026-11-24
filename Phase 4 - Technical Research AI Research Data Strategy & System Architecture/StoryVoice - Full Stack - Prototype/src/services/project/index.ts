import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/status";
import { logger } from "@/lib/logger";
import { Project } from "@/types/domain";
import { localStore } from "@/lib/local-store";

export class ProjectService {
  static async listUserProjects(userId: string): Promise<Project[]> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = await createServerSupabaseClient();
        const { data, error } = await supabase
          .from("projects")
          .select("*")
          .eq("user_id", userId)
          .order("updated_at", { ascending: false });

        if (!error && data) {
          return data.map((row) => ({
            id: row.id,
            userId: row.user_id,
            title: row.title,
            genre: row.genre,
            description: row.description,
            notes: row.notes,
            status: row.status,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          }));
        }
      } catch {
        // Fallback to localStore
      }
    }

    const projects: Project[] = [];
    for (const p of localStore.projects.values()) {
      if (p.user_id === userId || !p.user_id) {
        projects.push({
          id: p.id,
          userId: p.user_id,
          title: p.title,
          genre: p.genre ?? null,
          description: p.description ?? null,
          notes: p.notes ?? null,
          status: p.status,
          createdAt: p.created_at,
          updatedAt: p.updated_at,
        });
      }
    }
    return projects;
  }

  static async getProject(projectId: string, userId: string): Promise<Project | null> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = await createServerSupabaseClient();
        const { data, error } = await supabase
          .from("projects")
          .select("*")
          .eq("id", projectId)
          .eq("user_id", userId)
          .maybeSingle();

        if (!error && data) {
          return {
            id: data.id,
            userId: data.user_id,
            title: data.title,
            genre: data.genre,
            description: data.description,
            notes: data.notes,
            status: data.status,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          };
        }
      } catch {
        // Fallback
      }
    }

    const p = localStore.projects.get(projectId);
    if (!p) return null;

    return {
      id: p.id,
      userId: p.user_id,
      title: p.title,
      genre: p.genre ?? null,
      description: p.description ?? null,
      notes: p.notes ?? null,
      status: p.status,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    };
  }

  static async createProject(
    userId: string,
    params: { title: string; genre?: string; description?: string; notes?: string }
  ): Promise<Project> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = await createServerSupabaseClient();
        const { data, error } = await supabase
          .from("projects")
          .insert({
            user_id: userId,
            title: params.title.trim(),
            genre: params.genre?.trim() || null,
            description: params.description?.trim() || null,
            notes: params.notes?.trim() || null,
          })
          .select("*")
          .single();

        if (!error && data) {
          logger.info("Project created successfully", { projectId: data.id, userId });
          return {
            id: data.id,
            userId: data.user_id,
            title: data.title,
            genre: data.genre,
            description: data.description,
            notes: data.notes,
            status: data.status,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          };
        }
      } catch {
        // Fallback
      }
    }

    const newId = `project-${Date.now()}`;
    const now = new Date().toISOString();
    const stored = {
      id: newId,
      user_id: userId,
      title: params.title.trim(),
      genre: params.genre?.trim() || null,
      description: params.description?.trim() || null,
      notes: params.notes?.trim() || null,
      status: "in_progress" as const,
      created_at: now,
      updated_at: now,
    };
    localStore.projects.set(newId, stored);

    return {
      id: stored.id,
      userId: stored.user_id,
      title: stored.title,
      genre: stored.genre ?? null,
      description: stored.description ?? null,
      notes: stored.notes ?? null,
      status: stored.status,
      createdAt: stored.created_at,
      updatedAt: stored.updated_at,
    };
  }

  static async updateProject(
    projectId: string,
    userId: string,
    params: { title?: string; genre?: string; description?: string; notes?: string; status?: "in_progress" | "completed" | "archived" }
  ): Promise<Project> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = await createServerSupabaseClient();
        const updatePayload: Record<string, unknown> = {
          updated_at: new Date().toISOString(),
        };
        if (params.title !== undefined) updatePayload.title = params.title.trim();
        if (params.genre !== undefined) updatePayload.genre = params.genre?.trim() || null;
        if (params.description !== undefined) updatePayload.description = params.description?.trim() || null;
        if (params.notes !== undefined) updatePayload.notes = params.notes?.trim() || null;
        if (params.status !== undefined) updatePayload.status = params.status;

        const { data, error } = await supabase
          .from("projects")
          .update(updatePayload)
          .eq("id", projectId)
          .eq("user_id", userId)
          .select("*")
          .single();

        if (!error && data) {
          return {
            id: data.id,
            userId: data.user_id,
            title: data.title,
            genre: data.genre,
            description: data.description,
            notes: data.notes,
            status: data.status,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          };
        }
      } catch {
        // Fallback
      }
    }

    const p = localStore.projects.get(projectId);
    if (!p) throw new Error("Project not found");

    if (params.title !== undefined) p.title = params.title.trim();
    if (params.genre !== undefined) p.genre = params.genre?.trim() || null;
    if (params.description !== undefined) p.description = params.description?.trim() || null;
    if (params.notes !== undefined) p.notes = params.notes?.trim() || null;
    if (params.status !== undefined) p.status = params.status;
    p.updated_at = new Date().toISOString();

    return {
      id: p.id,
      userId: p.user_id,
      title: p.title,
      genre: p.genre ?? null,
      description: p.description ?? null,
      notes: p.notes ?? null,
      status: p.status,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    };
  }

  static async deleteProject(projectId: string, userId: string): Promise<void> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = await createServerSupabaseClient();
        await supabase
          .from("projects")
          .delete()
          .eq("id", projectId)
          .eq("user_id", userId);
      } catch {
        // Fallback
      }
    }

    localStore.projects.delete(projectId);
  }
}
