import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/status";
import { TranscriptionService } from "@/services/transcription";
import { localStore } from "@/lib/local-store";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";

export interface RequestUploadParams {
  userId: string;
  projectId: string;
  title: string;
  mimeType: string;
  fileSizeBytes: number;
  sourceType: "browser_recording" | "file_upload";
}

export class AudioService {
  private static ALLOWED_MIME_TYPES = new Set([
    "audio/webm",
    "audio/webm;codecs=opus",
    "audio/mp4",
    "audio/x-m4a",
    "audio/wav",
    "audio/mpeg",
    "audio/ogg",
  ]);

  static async requestUpload(params: RequestUploadParams) {
    const { userId, projectId, title, mimeType, fileSizeBytes, sourceType } = params;

    const baseMime = mimeType.split(";")[0].toLowerCase();
    if (!this.ALLOWED_MIME_TYPES.has(baseMime) && !this.ALLOWED_MIME_TYPES.has(mimeType.toLowerCase())) {
      throw new Error(`Unsupported audio format: ${mimeType}`);
    }

    if (fileSizeBytes > 250 * 1024 * 1024) {
      throw new Error("File exceeds maximum allowed size of 250 MB");
    }

    let ext = "webm";
    if (baseMime.includes("mp4") || baseMime.includes("m4a")) ext = "m4a";
    else if (baseMime.includes("wav")) ext = "wav";
    else if (baseMime.includes("mpeg")) ext = "mp3";
    else if (baseMime.includes("ogg")) ext = "ogg";

    const assetId = crypto.randomUUID();
    const storagePath = `${userId}/${projectId}/${assetId}.${ext}`;

    if (isSupabaseConfigured()) {
      try {
        const supabase = await createServerSupabaseClient();
        const { data: project } = await supabase
          .from("projects")
          .select("id")
          .eq("id", projectId)
          .eq("user_id", userId)
          .maybeSingle();

        if (project) {
          await supabase.from("audio_assets").insert({
            id: assetId,
            project_id: projectId,
            user_id: userId,
            title: title.trim() || "Untitled Recording",
            storage_path: storagePath,
            storage_bucket: env.STORAGE_AUDIO_BUCKET,
            mime_type: mimeType,
            file_size_bytes: fileSizeBytes,
            source_type: sourceType,
            status: "pending_verification",
          });

          const adminClient = createAdminClient();
          const { data: uploadData } = await adminClient.storage
            .from(env.STORAGE_AUDIO_BUCKET)
            .createSignedUploadUrl(storagePath);

          return {
            audioAssetId: assetId,
            storagePath,
            signedUploadUrl: uploadData?.signedUrl || null,
          };
        }
      } catch {
        // Database not reachable, fallback to localStore
      }
    }

    // Local / Dev Fallback
    localStore.audioAssets.set(assetId, {
      id: assetId,
      project_id: projectId,
      user_id: userId,
      title: title.trim() || "Untitled Recording",
      storage_path: storagePath,
      storage_bucket: "audio_recordings",
      mime_type: mimeType,
      file_size_bytes: fileSizeBytes,
      duration_seconds: null,
      source_type: sourceType,
      status: "pending_verification",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    logger.info("Local audio asset prepared for ingestion", { assetId, projectId, title });

    return {
      audioAssetId: assetId,
      storagePath,
      signedUploadUrl: null,
    };
  }

  static async confirmUpload(
    audioAssetId: string,
    userId: string,
    options?: { clientTranscript?: string; durationSeconds?: number; afterSceneId?: string }
  ) {
    let asset = localStore.audioAssets.get(audioAssetId);
    let projectId = asset?.project_id || "demo-project-1";
    let storagePath = asset?.storage_path || `${userId}/${projectId}/${audioAssetId}.webm`;
    let mimeType = asset?.mime_type || "audio/webm";

    if (isSupabaseConfigured()) {
      try {
        const supabase = await createServerSupabaseClient();
        const { data: dbAsset } = await supabase
          .from("audio_assets")
          .select("*")
          .eq("id", audioAssetId)
          .maybeSingle();

        if (dbAsset) {
          const updatePayload: Record<string, unknown> = {
            status: "verified",
            updated_at: new Date().toISOString(),
          };
          if (options?.durationSeconds) updatePayload.duration_seconds = options.durationSeconds;

          await supabase
            .from("audio_assets")
            .update(updatePayload)
            .eq("id", audioAssetId);

          projectId = dbAsset.project_id;
          storagePath = dbAsset.storage_path;
          mimeType = dbAsset.mime_type;
        }
      } catch {
        // Fallback
      }
    }

    if (asset) {
      asset.status = "verified";
      if (options?.durationSeconds) asset.duration_seconds = options.durationSeconds;
      asset.updated_at = new Date().toISOString();
    }

    // Process transcription immediately with real speech transcript if captured
    const transResult = await TranscriptionService.processAudioTranscription({
      audioAssetId,
      userId,
      projectId,
      storagePath,
      mimeType,
      clientTranscript: options?.clientTranscript,
      durationSeconds: options?.durationSeconds,
      afterSceneId: options?.afterSceneId,
    });

    // Enqueue queue record as well
    const jobId = `job-${Date.now()}`;
    localStore.jobs.set(jobId, {
      id: jobId,
      status: "completed",
      result: transResult,
    });

    localStore.logActivity({
      projectId,
      userId,
      type: "recording",
      title: `Recorded audio pass (${asset?.title || "Spoken Scene"})`,
      details: `Preserved audio recording in storage and generated source transcript (${transResult.wordCount} words).`,
    });

    logger.info("Confirmed audio upload and generated transcript", {
      audioAssetId,
      jobId,
      transcriptId: transResult.transcriptId,
      hasClientTranscript: !!options?.clientTranscript,
    });

    return {
      success: true,
      audioAssetId,
      transcriptId: transResult.transcriptId,
      revisionId: transResult.revisionId,
      jobId,
    };
  }

  static async getAudioAsset(assetId: string, userId: string) {
    const local = localStore.audioAssets.get(assetId);
    if (local && (local.user_id === userId || !local.user_id)) {
      return local;
    }

    if (!isSupabaseConfigured()) {
      return null;
    }

    try {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase
        .from("audio_assets")
        .select("*")
        .eq("id", assetId)
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        logger.error("Failed fetching audio asset", error, { assetId, userId });
        return null;
      }

      return data;
    } catch {
      return null;
    }
  }

  static async getPlaybackUrl(assetId: string, userId: string): Promise<string | null> {
    if (!isSupabaseConfigured()) {
      return null;
    }

    try {
      const adminClient = createAdminClient();
      const asset = await this.getAudioAsset(assetId, userId);
      if (!asset) return null;

      const { data } = await adminClient.storage
        .from(asset.storage_bucket || env.STORAGE_AUDIO_BUCKET)
        .createSignedUrl(asset.storage_path, 3600);

      return data?.signedUrl || null;
    } catch {
      return null;
    }
  }
}
