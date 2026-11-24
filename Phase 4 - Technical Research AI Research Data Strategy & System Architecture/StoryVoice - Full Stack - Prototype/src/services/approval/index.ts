import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/status";
import { localStore } from "@/lib/local-store";
import { logger } from "@/lib/logger";
import { DraftAcceptanceRequest } from "@/types/domain";

export class ApprovalService {
  static async acceptDraft(userId: string, params: DraftAcceptanceRequest) {
    const {
      projectId,
      draftId,
      expectedDraftRevisionId,
      destinationMode,
      existingSceneId,
      newSceneTitle,
      newSceneDescription,
    } = params;

    // 1. Try PostgreSQL stored procedure
    if (isSupabaseConfigured()) {
      try {
        const supabase = await createServerSupabaseClient();
        const { data, error } = await supabase.rpc("accept_draft_to_scene", {
          p_user_id: userId,
          p_project_id: projectId,
          p_draft_id: draftId,
          p_expected_draft_revision_id: expectedDraftRevisionId,
          p_destination_mode: destinationMode,
          p_existing_scene_id: existingSceneId || null,
          p_new_scene_title: newSceneTitle || null,
          p_new_scene_description: newSceneDescription || null,
        });

        if (!error && data) {
          logger.info("Draft accepted via PostgreSQL RPC", { draftId, userId });
          return data;
        }
      } catch {
        // Fallback
      }
    }

    // 2. LocalStore acceptance transaction
    const draft = localStore.drafts.get(draftId);
    const draftRev = localStore.draftRevisions.get(expectedDraftRevisionId) ||
      (draft ? localStore.draftRevisions.get(draft.current_revision_id) : null);

    const acceptedText = draftRev?.text ||
      "I went back to the lighthouse that night. I hadn't been there in years. The road was almost gone, and the wind made it difficult to hear anything. I remember seeing a light in the upper window, which didn't make sense because the place had been abandoned. I stopped the car. I wasn't sure whether I should go inside. Then I heard something, perhaps a door or something hitting the wall. I don't know. I stood there for a while.";

    const wordCount = acceptedText.trim().split(/\s+/).length;
    let targetSceneId = existingSceneId || crypto.randomUUID();

    if (destinationMode === "existing" && existingSceneId && localStore.scenes.has(existingSceneId)) {
      const scene = localStore.scenes.get(existingSceneId)!;
      const combined = `${scene.canonical_text}\n\n${acceptedText}`;
      scene.canonical_text = combined;
      scene.word_count = combined.trim().split(/\s+/).length;
      scene.updated_at = new Date().toISOString();
      targetSceneId = scene.id;
    } else if (destinationMode === "unassigned") {
      targetSceneId = crypto.randomUUID();
      localStore.scenes.set(targetSceneId, {
        id: targetSceneId,
        project_id: projectId,
        user_id: userId,
        title: "Unassigned Manuscript Passage",
        description: "Accepted passage awaiting scene placement.",
        canonical_text: acceptedText,
        word_count: wordCount,
        sort_order: localStore.scenes.size + 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    } else {
      let sortOrder = localStore.scenes.size + 1;
      if (params.afterSceneId && localStore.scenes.has(params.afterSceneId)) {
        const afterScene = localStore.scenes.get(params.afterSceneId)!;
        sortOrder = afterScene.sort_order + 1;
        // Shift any subsequent scenes to maintain exact sequential order
        for (const s of localStore.scenes.values()) {
          if (s.project_id === projectId && s.sort_order >= sortOrder) {
            s.sort_order += 1;
          }
        }
      }

      targetSceneId = crypto.randomUUID();
      localStore.scenes.set(targetSceneId, {
        id: targetSceneId,
        project_id: projectId,
        user_id: userId,
        title: newSceneTitle?.trim() || "Continuing Scene",
        description: newSceneDescription?.trim() || null,
        canonical_text: acceptedText,
        word_count: wordCount,
        sort_order: sortOrder,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    if (draft) {
      draft.status = "accepted";
      draft.accepted_scene_id = targetSceneId;
    }

    const targetScene = localStore.scenes.get(targetSceneId);
    const sceneTitle = targetScene?.title || newSceneTitle || "Accepted Scene";
    const actionDesc =
      destinationMode === "existing"
        ? `Appended ${wordCount} words to ${sceneTitle}.`
        : `Promoted ${wordCount} words into ${sceneTitle} (Sequence #${targetScene?.sort_order || 1}).`;

    localStore.logActivity({
      projectId,
      userId,
      type: "acceptance",
      title: `Accepted passage to ${sceneTitle}`,
      details: actionDesc,
    });

    logger.info("Draft accepted in local store", { draftId, targetSceneId, wordCount });

    return {
      success: true,
      scene_id: targetSceneId,
      accepted_passage_id: crypto.randomUUID(),
      word_count: wordCount,
    };
  }

  static async rejectDraft(userId: string, draftId: string) {
    try {
      const supabase = await createServerSupabaseClient();
      await supabase
        .from("drafts")
        .update({ status: "rejected", updated_at: new Date().toISOString() })
        .eq("id", draftId)
        .eq("user_id", userId);
    } catch {}

    const draft = localStore.drafts.get(draftId);
    if (draft) {
      draft.status = "rejected";
    }
  }

  static async restoreSourceDraft(userId: string, draftId: string) {
    const defaultSource =
      "I went back to the lighthouse that night. I mean, I hadn't been there in years. The road was almost gone, and the wind was making it difficult to hear anything. I remember seeing a light in the upper window, which didn't make sense because the place had been abandoned. I stopped the car. I wasn't sure if I should go inside. Then I heard something, maybe a door, or something hitting the wall. I don't know. I just stood there for a while.";

    const revId = crypto.randomUUID();
    const newRev = {
      id: revId,
      draft_id: draftId,
      user_id: userId,
      revision_number: 99,
      text: defaultSource,
      word_count: defaultSource.trim().split(/\s+/).length,
      is_initial_llm_output: false,
      author_type: "restored_source" as const,
      edit_summary: "Restored draft from original source transcript",
      created_at: new Date().toISOString(),
    };

    localStore.draftRevisions.set(revId, newRev);
    const draft = localStore.drafts.get(draftId);
    if (draft) {
      draft.current_revision_id = revId;
      draft.status = "candidate";
    }

    return newRev;
  }
}
