export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type TransformationMode = "faithful" | "clean" | "readable";
export type JobType =
  | "audio_validation"
  | "transcription"
  | "transcript_postprocess"
  | "transformation"
  | "export_generation";
export type JobStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "retrying"
  | "cancelled";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          typography_preference: "serif" | "sans";
          interface_density: "comfortable" | "compact";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          typography_preference?: "serif" | "sans";
          interface_density?: "comfortable" | "compact";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string | null;
          typography_preference?: "serif" | "sans";
          interface_density?: "comfortable" | "compact";
          updated_at?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          genre: string | null;
          description: string | null;
          notes: string | null;
          status: "in_progress" | "completed" | "archived";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          genre?: string | null;
          description?: string | null;
          notes?: string | null;
          status?: "in_progress" | "completed" | "archived";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          genre?: string | null;
          description?: string | null;
          notes?: string | null;
          status?: "in_progress" | "completed" | "archived";
          updated_at?: string;
        };
      };
      scenes: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          title: string;
          description: string | null;
          canonical_text: string;
          word_count: number;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          title: string;
          description?: string | null;
          canonical_text?: string;
          word_count?: number;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          canonical_text?: string;
          word_count?: number;
          sort_order?: number;
          updated_at?: string;
        };
      };
      audio_assets: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          title: string;
          storage_path: string;
          storage_bucket: string;
          mime_type: string;
          file_size_bytes: number;
          duration_seconds: number | null;
          source_type: "browser_recording" | "file_upload";
          status: "pending_verification" | "verified" | "transcribed" | "failed" | "deleted";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          title: string;
          storage_path: string;
          storage_bucket?: string;
          mime_type: string;
          file_size_bytes: number;
          duration_seconds?: number | null;
          source_type: "browser_recording" | "file_upload";
          status?: "pending_verification" | "verified" | "transcribed" | "failed" | "deleted";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          duration_seconds?: number | null;
          status?: "pending_verification" | "verified" | "transcribed" | "failed" | "deleted";
          updated_at?: string;
        };
      };
      transcripts: {
        Row: {
          id: string;
          audio_asset_id: string;
          project_id: string;
          user_id: string;
          provider: string;
          model: string;
          raw_provider_response: Json | null;
          current_revision_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          audio_asset_id: string;
          project_id: string;
          user_id: string;
          provider: string;
          model: string;
          raw_provider_response?: Json | null;
          current_revision_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          current_revision_id?: string | null;
          updated_at?: string;
        };
      };
      transcript_revisions: {
        Row: {
          id: string;
          transcript_id: string;
          user_id: string;
          revision_number: number;
          text: string;
          word_count: number;
          is_source: boolean;
          edit_summary: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          transcript_id: string;
          user_id: string;
          revision_number: number;
          text: string;
          word_count?: number;
          is_source?: boolean;
          edit_summary?: string | null;
          created_at?: string;
        };
        Update: {
          edit_summary?: string | null;
        };
      };
      story_context_items: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          type: "Character" | "Location" | "Terminology" | "Approved story fact" | "Suggestion";
          name: string;
          detail: string;
          approved: boolean;
          origin: "writer_created" | "ai_suggested" | "imported";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          type: "Character" | "Location" | "Terminology" | "Approved story fact" | "Suggestion";
          name: string;
          detail?: string;
          approved?: boolean;
          origin?: "writer_created" | "ai_suggested" | "imported";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          type?: "Character" | "Location" | "Terminology" | "Approved story fact" | "Suggestion";
          name?: string;
          detail?: string;
          approved?: boolean;
          updated_at?: string;
        };
      };
      vocabulary_items: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          term: string;
          phonetic_hint: string | null;
          category: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          term: string;
          phonetic_hint?: string | null;
          category?: string | null;
          created_at?: string;
        };
        Update: {
          term?: string;
          phonetic_hint?: string | null;
          category?: string | null;
        };
      };
      drafts: {
        Row: {
          id: string;
          transformation_job_id: string | null;
          project_id: string;
          user_id: string;
          source_transcript_id: string;
          source_revision_id: string;
          mode: TransformationMode;
          current_revision_id: string | null;
          status: "candidate" | "accepted" | "rejected" | "archived";
          accepted_scene_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          transformation_job_id?: string | null;
          project_id: string;
          user_id: string;
          source_transcript_id: string;
          source_revision_id: string;
          mode: TransformationMode;
          current_revision_id?: string | null;
          status?: "candidate" | "accepted" | "rejected" | "archived";
          accepted_scene_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          current_revision_id?: string | null;
          status?: "candidate" | "accepted" | "rejected" | "archived";
          accepted_scene_id?: string | null;
          updated_at?: string;
        };
      };
      draft_revisions: {
        Row: {
          id: string;
          draft_id: string;
          user_id: string;
          revision_number: number;
          text: string;
          word_count: number;
          is_initial_llm_output: boolean;
          author_type: "llm" | "writer_edit" | "restored_source";
          edit_summary: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          draft_id: string;
          user_id: string;
          revision_number: number;
          text: string;
          word_count?: number;
          is_initial_llm_output?: boolean;
          author_type: "llm" | "writer_edit" | "restored_source";
          edit_summary?: string | null;
          created_at?: string;
        };
        Update: {
          edit_summary?: string | null;
        };
      };
      accepted_passages: {
        Row: {
          id: string;
          scene_id: string;
          draft_id: string;
          draft_revision_id: string;
          source_transcript_id: string;
          source_revision_id: string;
          project_id: string;
          user_id: string;
          accepted_text: string;
          word_count: number;
          position_index: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          scene_id: string;
          draft_id: string;
          draft_revision_id: string;
          source_transcript_id: string;
          source_revision_id: string;
          project_id: string;
          user_id: string;
          accepted_text: string;
          word_count: number;
          position_index?: number;
          created_at?: string;
        };
        Update: {
          position_index?: number;
        };
      };
      processing_jobs: {
        Row: {
          id: string;
          job_type: JobType;
          status: JobStatus;
          idempotency_key: string;
          project_id: string;
          user_id: string;
          payload: Json;
          result: Json | null;
          attempts: number;
          max_attempts: number;
          last_error: string | null;
          locked_by: string | null;
          locked_until: string | null;
          scheduled_for: string;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          job_type: JobType;
          status?: JobStatus;
          idempotency_key: string;
          project_id: string;
          user_id: string;
          payload?: Json;
          result?: Json | null;
          attempts?: number;
          max_attempts?: number;
          last_error?: string | null;
          locked_by?: string | null;
          locked_until?: string | null;
          scheduled_for?: string;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: JobStatus;
          result?: Json | null;
          attempts?: number;
          last_error?: string | null;
          locked_by?: string | null;
          locked_until?: string | null;
          scheduled_for?: string;
          completed_at?: string | null;
          updated_at?: string;
        };
      };
    };
  };
}
