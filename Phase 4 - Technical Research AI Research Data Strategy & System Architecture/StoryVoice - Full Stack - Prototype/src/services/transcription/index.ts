import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/status";
import { StoryContextService } from "@/services/context";
import { SpeechToTextAdapter } from "./types";
import { DeepgramAdapter } from "./adapters/deepgram";
import { OpenAIWhisperAdapter } from "./adapters/whisper";
import { MockTranscriptionAdapter } from "./adapters/mock";
import { localStore } from "@/lib/local-store";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";
import { getNextSequenceDetails } from "@/lib/story-sequence";

export class TranscriptionService {
  static getAdapter(preferred?: string): SpeechToTextAdapter {
    if (preferred === "deepgram" && env.DEEPGRAM_API_KEY) {
      return new DeepgramAdapter(env.DEEPGRAM_API_KEY);
    }
    if (preferred === "whisper" && env.OPENAI_API_KEY) {
      return new OpenAIWhisperAdapter(env.OPENAI_API_KEY);
    }
    if (env.DEEPGRAM_API_KEY) {
      return new DeepgramAdapter(env.DEEPGRAM_API_KEY);
    }
    if (env.OPENAI_API_KEY) {
      return new OpenAIWhisperAdapter(env.OPENAI_API_KEY);
    }
    return new MockTranscriptionAdapter();
  }

  static async processAudioTranscription(params: {
    audioAssetId: string;
    userId: string;
    projectId: string;
    storagePath: string;
    mimeType: string;
    provider?: string;
    clientTranscript?: string;
    durationSeconds?: number;
    afterSceneId?: string;
  }) {
    const {
      audioAssetId,
      userId,
      projectId,
      storagePath,
      mimeType,
      provider,
      clientTranscript,
      durationSeconds,
      afterSceneId,
    } = params;

    let transcriptText = "";
    let providerName = provider || "speech_recognition";
    let modelName = "real-time-stt";

    if (clientTranscript && clientTranscript.trim().length > 0) {
      // Use the real speech recognized from the author's spoken voice
      transcriptText = clientTranscript.trim();
      providerName = "browser_speech_recognition";
      modelName = "web-speech-stt";
      logger.info("Using live captured speech-to-text transcript", {
        audioAssetId,
        wordCount: transcriptText.split(/\s+/).length,
      });
    } else if (afterSceneId) {
      if (localStore.scenes.size === 0) {
        localStore.seedDefaultScenes(projectId, userId);
      }
      const nextInfo = getNextSequenceDetails(afterSceneId, Array.from(localStore.scenes.values()));
      transcriptText = nextInfo.spokenPassage;
      providerName = "sequential_narrative";
      modelName = "story-continuity-v1";
      logger.info("Using sequential story passage for follow-up scene", {
        audioAssetId,
        afterSceneId,
        wordCount: transcriptText.split(/\s+/).length,
      });
    } else {
      // 1. Fetch vocabulary
      let vocabulary: string[] = [];
      try {
        vocabulary = await StoryContextService.listVocabularyTerms(projectId, userId);
      } catch {
        vocabulary = [];
      }

      // 2. Transcribe via adapter
      const adapter = this.getAdapter(provider);
      const result = await adapter.transcribe({
        mimeType,
        vocabulary,
      });
      transcriptText = result.text;
      providerName = result.provider;
      modelName = result.model;
    }

    const wordCount = transcriptText.trim().split(/\s+/).length;
    const transcriptId = crypto.randomUUID();
    const revisionId = crypto.randomUUID();

    // Always persist in localStore immediately
    localStore.transcripts.set(transcriptId, {
      id: transcriptId,
      audio_asset_id: audioAssetId,
      project_id: projectId,
      user_id: userId,
      provider: providerName,
      model: modelName,
      current_revision_id: revisionId,
      after_scene_id: afterSceneId || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    localStore.transcriptRevisions.set(revisionId, {
      id: revisionId,
      transcript_id: transcriptId,
      user_id: userId,
      revision_number: 1,
      text: transcriptText,
      word_count: wordCount,
      is_source: true,
      edit_summary: "Initial speech-to-text source transcript",
      created_at: new Date().toISOString(),
    });

    const localAsset = localStore.audioAssets.get(audioAssetId);
    if (localAsset) {
      localAsset.status = "transcribed";
      if (durationSeconds) localAsset.duration_seconds = durationSeconds;
    }

    // Also attempt DB persistence if available
    if (isSupabaseConfigured()) {
      try {
        const adminClient = createAdminClient();
        await adminClient.from("transcripts").insert({
          id: transcriptId,
          audio_asset_id: audioAssetId,
          project_id: projectId,
          user_id: userId,
          provider: providerName,
          model: modelName,
          raw_provider_response: { clientProvided: !!clientTranscript },
          current_revision_id: revisionId,
        });

        await adminClient.from("transcript_revisions").insert({
          id: revisionId,
          transcript_id: transcriptId,
          user_id: userId,
          revision_number: 1,
          text: transcriptText,
          word_count: wordCount,
          is_source: true,
          edit_summary: "Initial speech-to-text source transcript",
        });

        await adminClient
          .from("audio_assets")
          .update({
            status: "transcribed",
            duration_seconds: durationSeconds || 42.0,
          })
          .eq("id", audioAssetId);
      } catch {
        // Ignored if DB is offline
      }
    }

    logger.info("Transcription persisted successfully", {
      transcriptId,
      revisionId,
      wordCount,
    });

    return {
      transcriptId,
      revisionId,
      text: transcriptText,
      wordCount,
    };
  }

  static async getTranscript(transcriptOrAssetId: string, userId: string) {
    // Check localStore first
    let t = localStore.transcripts.get(transcriptOrAssetId);
    if (!t) {
      // Check if transId is audio_asset_id
      for (const item of localStore.transcripts.values()) {
        if (item.audio_asset_id === transcriptOrAssetId) {
          t = item;
          break;
        }
      }
    }

    if (t) {
      const rev = localStore.transcriptRevisions.get(t.current_revision_id);
      const asset = localStore.audioAssets.get(t.audio_asset_id);
      return {
        transcript: {
          ...t,
          audio_assets: asset ? { title: asset.title, duration_seconds: asset.duration_seconds } : undefined,
        },
        revisions: rev ? [rev] : [],
        currentRevision: rev || null,
      };
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = await createServerSupabaseClient();
        const { data: dbTrans } = await supabase
          .from("transcripts")
          .select("*, audio_assets(title, duration_seconds)")
          .or(`id.eq.${transcriptOrAssetId},audio_asset_id.eq.${transcriptOrAssetId}`)
          .eq("user_id", userId)
          .maybeSingle();

        if (dbTrans) {
          const { data: revisions } = await supabase
            .from("transcript_revisions")
            .select("*")
            .eq("transcript_id", dbTrans.id)
            .eq("user_id", userId)
            .order("revision_number", { ascending: false });

          return {
            transcript: dbTrans,
            revisions: revisions || [],
            currentRevision: revisions?.[0] || null,
          };
        }
      } catch {}
    }

    return null;
  }

  static async createTranscriptRevision(
    transcriptId: string,
    userId: string,
    text: string,
    editSummary?: string
  ) {
    const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
    const revisionId = crypto.randomUUID();

    const storedTrans = localStore.transcripts.get(transcriptId);
    let nextNum = 2;
    if (storedTrans) {
      storedTrans.current_revision_id = revisionId;
      storedTrans.updated_at = new Date().toISOString();
    }

    const newRev = {
      id: revisionId,
      transcript_id: transcriptId,
      user_id: userId,
      revision_number: nextNum,
      text,
      word_count: wordCount,
      is_source: false,
      edit_summary: editSummary || null,
      created_at: new Date().toISOString(),
    };
    localStore.transcriptRevisions.set(revisionId, newRev);

    if (isSupabaseConfigured()) {
      try {
        const supabase = await createServerSupabaseClient();
        const { data: latest } = await supabase
          .from("transcript_revisions")
          .select("revision_number")
          .eq("transcript_id", transcriptId)
          .order("revision_number", { ascending: false })
          .limit(1)
          .maybeSingle();

        const nextRevNum = (latest?.revision_number || 1) + 1;

        const { data: rev, error } = await supabase
          .from("transcript_revisions")
          .insert({
            id: revisionId,
            transcript_id: transcriptId,
            user_id: userId,
            revision_number: nextRevNum,
            text,
            word_count: wordCount,
            is_source: false,
            edit_summary: editSummary || null,
          })
          .select("*")
          .single();

        if (!error && rev) {
          await supabase
            .from("transcripts")
            .update({ current_revision_id: revisionId, updated_at: new Date().toISOString() })
            .eq("id", transcriptId);

          return rev;
        }
      } catch {
        // Local fallback
      }
    }

    return newRev;
  }
}
