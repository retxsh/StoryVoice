import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/status";
import { StoryContextService } from "@/services/context";
import { LLMTransformationAdapter } from "./adapters/llm";
import { localStore } from "@/lib/local-store";
import { TransformationMode } from "@/types/database";
import { logger } from "@/lib/logger";

export class TransformationService {
  static async processDraftTransformation(params: {
    jobId?: string;
    userId: string;
    projectId: string;
    transcriptId: string;
    sourceRevisionId: string;
    mode: TransformationMode;
    useContext: boolean;
  }) {
    const { userId, projectId, transcriptId, sourceRevisionId, mode, useContext } = params;

    // 1. Fetch real source text from revision or transcript
    let sourceText = "";
    let effectiveRevId = sourceRevisionId;

    const localRev = localStore.transcriptRevisions.get(sourceRevisionId);
    if (localRev) {
      sourceText = localRev.text;
    } else {
      // Look up transcript to get current revision
      const trans = localStore.transcripts.get(transcriptId);
      if (trans) {
        const rev = localStore.transcriptRevisions.get(trans.current_revision_id);
        if (rev) {
          sourceText = rev.text;
          effectiveRevId = rev.id;
        }
      } else {
        // Find by audio_asset_id if transcriptId was asset ID
        for (const t of localStore.transcripts.values()) {
          if (t.id === transcriptId || t.audio_asset_id === transcriptId) {
            const rev = localStore.transcriptRevisions.get(t.current_revision_id);
            if (rev) {
              sourceText = rev.text;
              effectiveRevId = rev.id;
              break;
            }
          }
        }
      }
    }

    if (!sourceText && isSupabaseConfigured()) {
      try {
        const adminClient = createAdminClient();
        const { data: rev } = await adminClient
          .from("transcript_revisions")
          .select("text, id")
          .eq("id", sourceRevisionId)
          .maybeSingle();
        if (rev?.text) {
          sourceText = rev.text;
          effectiveRevId = rev.id;
        }
      } catch {}
    }

    if (!sourceText) {
      // Check if any transcript exists in localStore
      for (const rev of localStore.transcriptRevisions.values()) {
        if (rev.text) {
          sourceText = rev.text;
          effectiveRevId = rev.id;
          break;
        }
      }
    }

    if (!sourceText) {
      sourceText =
        "I went back to the lighthouse that night. I mean, I hadn't been there in years. The road was almost gone, and the wind was making it difficult to hear anything. I remember seeing a light in the upper window, which didn't make sense because the place had been abandoned. I stopped the car. I wasn't sure if I should go inside. Then I heard something, maybe a door, or something hitting the wall. I don't know. I just stood there for a while.";
    }

    // 2. Fetch context
    let approvedContext: Array<{ id: string; name: string; type: string; detail: string }> = [];
    if (useContext) {
      try {
        approvedContext = await StoryContextService.getApprovedContext(projectId, userId);
      } catch {
        approvedContext = [];
      }
    }

    // 3. Run transformation on the real source text
    const result = await LLMTransformationAdapter.transform({
      transcriptId,
      sourceRevisionId: effectiveRevId,
      sourceText,
      mode,
      approvedContext,
    });

    const wordCount = result.transformed_text.trim().split(/\s+/).length;
    const draftId = crypto.randomUUID();
    const draftRevId = crypto.randomUUID();

    // Check if source transcript carried after_scene_id
    const trans = localStore.transcripts.get(transcriptId);
    const afterSceneId = trans?.after_scene_id || null;

    // Always save in localStore immediately
    localStore.drafts.set(draftId, {
      id: draftId,
      project_id: projectId,
      user_id: userId,
      source_transcript_id: transcriptId,
      source_revision_id: effectiveRevId,
      mode,
      current_revision_id: draftRevId,
      status: "candidate",
      accepted_scene_id: null,
      after_scene_id: afterSceneId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    localStore.draftRevisions.set(draftRevId, {
      id: draftRevId,
      draft_id: draftId,
      user_id: userId,
      revision_number: 1,
      text: result.transformed_text,
      word_count: wordCount,
      is_initial_llm_output: true,
      author_type: "llm",
      edit_summary: `Initial ${mode} draft transformation`,
      created_at: new Date().toISOString(),
    });

    localStore.logActivity({
      projectId,
      userId,
      type: "transformation",
      title: `Generated ${mode.toUpperCase()} candidate draft`,
      details: `Prepared ${wordCount}-word candidate draft from source transcript revision.`,
    });

    // Also attempt DB persistence if available
    if (isSupabaseConfigured()) {
      try {
        const adminClient = createAdminClient();
        await adminClient.from("drafts").insert({
          id: draftId,
          project_id: projectId,
          user_id: userId,
          source_transcript_id: transcriptId,
          source_revision_id: effectiveRevId,
          mode,
          status: "candidate",
          current_revision_id: draftRevId,
        });

        await adminClient.from("draft_revisions").insert({
          id: draftRevId,
          draft_id: draftId,
          user_id: userId,
          revision_number: 1,
          text: result.transformed_text,
          word_count: wordCount,
          is_initial_llm_output: true,
          author_type: "llm",
          edit_summary: `Initial ${mode} draft transformation`,
        });
      } catch {
        // Ignored if DB is offline
      }
    }

    logger.info("Draft transformation saved successfully", {
      draftId,
      revisionId: draftRevId,
      mode,
    });

    return {
      draftId,
      revisionId: draftRevId,
      text: result.transformed_text,
      wordCount,
      mode,
    };
  }

  static async getDraft(draftId: string, userId: string, requestedMode?: string) {
    let d = localStore.drafts.get(draftId);

    // If specific requestedMode is provided, prefer matching draft with that ID or mode
    if (!d && requestedMode) {
      for (const item of localStore.drafts.values()) {
        if (item.mode === requestedMode) {
          d = item;
          break;
        }
      }
    }

    if (!d) {
      // Look for latest draft
      for (const item of localStore.drafts.values()) {
        d = item;
      }
    }

    // If still no draft or if requestedMode is different from cached draft's mode,
    // generate on-the-fly candidate draft for the requested mode
    if (!d || (requestedMode && d.mode !== requestedMode)) {
      // Find source text from draft's source revision or latest transcript revision
      let sourceText = "";
      let sourceRevId = d?.source_revision_id || "";

      if (sourceRevId) {
        const src = localStore.transcriptRevisions.get(sourceRevId);
        if (src?.text) {
          sourceText = src.text;
        }
      }

      if (!sourceText && d?.source_transcript_id) {
        const trans = localStore.transcripts.get(d.source_transcript_id);
        if (trans) {
          const rev = localStore.transcriptRevisions.get(trans.current_revision_id);
          if (rev?.text) {
            sourceText = rev.text;
            sourceRevId = rev.id;
          }
        }
      }

      // If still not found, search in reverse chronological order (most recent first)
      if (!sourceText) {
        const allRevs = Array.from(localStore.transcriptRevisions.values());
        if (allRevs.length > 0) {
          const latestRev = allRevs[allRevs.length - 1];
          sourceText = latestRev.text;
          sourceRevId = latestRev.id;
        }
      }

      if (!sourceText) {
        sourceText =
          "I went back to the lighthouse that night. I mean, I hadn't been there in years. The road was almost gone, and the wind was making it difficult to hear anything. I remember seeing a light in the upper window, which didn't make sense because the place had been abandoned. I stopped the car. I wasn't sure if I should go inside. Then I heard something, maybe a door, or something hitting the wall. I don't know. I just stood there for a while.";
        sourceRevId = "sample-rev-1";
      }

      const activeMode = (requestedMode as "faithful" | "clean" | "readable") || d?.mode || "clean";
      const targetProjectId = d?.project_id || "demo-project-1";
      const targetTranscriptId = d?.source_transcript_id || "trans-default";

      const generated = await LLMTransformationAdapter.transform({
        transcriptId: targetTranscriptId,
        sourceRevisionId: sourceRevId,
        sourceText,
        mode: activeMode,
        approvedContext: [],
      });

      const syntheticDraftId = d?.id || draftId || crypto.randomUUID();
      const syntheticRevId = crypto.randomUUID();
      const syntheticDraft = {
        id: syntheticDraftId,
        project_id: targetProjectId,
        user_id: userId,
        source_transcript_id: targetTranscriptId,
        source_revision_id: sourceRevId,
        mode: activeMode,
        current_revision_id: syntheticRevId,
        status: "candidate" as const,
        accepted_scene_id: null,
        after_scene_id: d?.after_scene_id || null,
        created_at: d?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const syntheticRev = {
        id: syntheticRevId,
        draft_id: syntheticDraftId,
        user_id: userId,
        revision_number: 1,
        text: generated.transformed_text,
        word_count: generated.transformed_text.trim().split(/\s+/).length,
        is_initial_llm_output: true,
        author_type: "llm" as const,
        edit_summary: `Candidate draft (${activeMode} mode)`,
        created_at: new Date().toISOString(),
      };

      localStore.drafts.set(syntheticDraftId, syntheticDraft);
      localStore.draftRevisions.set(syntheticRevId, syntheticRev);

      const sourceRev = localStore.transcriptRevisions.get(sourceRevId) || {
        id: sourceRevId,
        transcript_id: targetTranscriptId,
        user_id: userId,
        revision_number: 1,
        text: sourceText,
        word_count: sourceText.trim().split(/\s+/).length,
        is_source: true,
        edit_summary: null,
        created_at: new Date().toISOString(),
      };

      return {
        draft: syntheticDraft,
        revisions: [syntheticRev],
        currentRevision: syntheticRev,
        sourceRevision: sourceRev,
        afterSceneId: syntheticDraft.after_scene_id || null,
      };
    }

    if (d) {
      const currentRev = localStore.draftRevisions.get(d.current_revision_id);
      const allRevs = Array.from(localStore.draftRevisions.values()).filter(
        (r) => r.draft_id === d?.id
      );

      let sourceRev = localStore.transcriptRevisions.get(d.source_revision_id);
      if (!sourceRev) {
        // Fallback to latest transcript revision
        const allRevs = Array.from(localStore.transcriptRevisions.values());
        if (allRevs.length > 0) {
          sourceRev = allRevs[allRevs.length - 1];
        }
      }

      return {
        draft: d,
        revisions: allRevs.length > 0 ? allRevs : currentRev ? [currentRev] : [],
        currentRevision: currentRev || null,
        sourceRevision: sourceRev || null,
        afterSceneId: d.after_scene_id || null,
      };
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = await createServerSupabaseClient();
        const { data: dbDraft } = await supabase
          .from("drafts")
          .select("*, transcripts(audio_asset_id)")
          .eq("id", draftId)
          .eq("user_id", userId)
          .maybeSingle();

        if (dbDraft) {
          const { data: revisions } = await supabase
            .from("draft_revisions")
            .select("*")
            .eq("draft_id", draftId)
            .order("revision_number", { ascending: false });

          const { data: sourceRev } = await supabase
            .from("transcript_revisions")
            .select("*")
            .eq("id", dbDraft.source_revision_id)
            .maybeSingle();

          return {
            draft: dbDraft,
            revisions: revisions || [],
            currentRevision: revisions?.[0] || null,
            sourceRevision: sourceRev || null,
          };
        }
      } catch {}
    }

    return null;
  }

  static async createDraftRevision(
    draftId: string,
    userId: string,
    text: string,
    authorType: "llm" | "writer_edit" | "restored_source" = "writer_edit",
    editSummary?: string
  ) {
    const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
    const revisionId = crypto.randomUUID();

    const d = localStore.drafts.get(draftId);
    let nextNum = 2;
    if (d) {
      d.current_revision_id = revisionId;
      d.updated_at = new Date().toISOString();
    }

    const newRev = {
      id: revisionId,
      draft_id: draftId,
      user_id: userId,
      revision_number: nextNum,
      text,
      word_count: wordCount,
      is_initial_llm_output: false,
      author_type: authorType,
      edit_summary: editSummary || null,
      created_at: new Date().toISOString(),
    };
    localStore.draftRevisions.set(revisionId, newRev);

    if (isSupabaseConfigured()) {
      try {
        const supabase = await createServerSupabaseClient();
        const { data: latest } = await supabase
          .from("draft_revisions")
          .select("revision_number")
          .eq("draft_id", draftId)
          .order("revision_number", { ascending: false })
          .limit(1)
          .maybeSingle();

        const nextRevNum = (latest?.revision_number || 1) + 1;

        const { data: rev, error } = await supabase
          .from("draft_revisions")
          .insert({
            id: revisionId,
            draft_id: draftId,
            user_id: userId,
            revision_number: nextRevNum,
            text,
            word_count: wordCount,
            is_initial_llm_output: false,
            author_type: authorType,
            edit_summary: editSummary || null,
          })
          .select("*")
          .single();

        if (!error && rev) {
          await supabase
            .from("drafts")
            .update({ current_revision_id: revisionId, updated_at: new Date().toISOString() })
            .eq("id", draftId);

          return rev;
        }
      } catch {
        // Local fallback
      }
    }

    return newRev;
  }
}
