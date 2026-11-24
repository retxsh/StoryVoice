# StoryVoice — Data Model & Entity Relationship Specification

**Status:** Canonical Reference  
**Database:** PostgreSQL 16 (Supabase)  
**Security:** Mandatory Row Level Security (RLS) on all tables

---

## 1. Entity Relationship Overview

```
                      +------------------+
                      |   auth.users     |
                      +--------+---------+
                               |
            +------------------+------------------+
            | 1:1                                 | 1:N
            v                                     v
     +--------------+                     +---------------+
     |   profiles   |                     |   projects    |
     +--------------+                     +-------+-------+
                                                  |
           +-----------------+--------------------+--------------------+
           | 1:N             | 1:N                | 1:N                | 1:N
           v                 v                    v                    v
     +-----------+    +---------------+    +--------------+    +---------------+
     |  scenes   |    | audio_assets  |    |story_context |    |vocabulary_item|
     +-----+-----+    +-------+-------+    +--------------+    +---------------+
           |                  |
           |                  v 1:1
           |          +---------------+
           |          |  transcripts  |
           |          +-------+-------+
           |                  |
           |                  | 1:N
           |                  v
           |          +----------------------+
           |          | transcript_revisions |
           |          +----------+-----------+
           |                     |
           |                     | 1:N (Source for transformation)
           |                     v
           |          +---------------------+
           |          | transformation_jobs |
           |          +----------+----------+
           |                     |
           |                     v 1:1
           |          +---------------------+
           |          |       drafts        |
           |          +----------+----------+
           |                     |
           |                     | 1:N
           |                     v
           |          +---------------------+
           |          |   draft_revisions   |
           |          +----------+----------+
           |                     |
           +----------+----------+
                      |
                      v 1:N
           +---------------------+
           |  accepted_passages  |
           +----------+----------+
                      |
                      v 1:1
           +---------------------+
           |   approval_events   |
           +---------------------+
```

---

## 2. Table Schemas & Constraints

### 2.1 `profiles`
Extends `auth.users` with editorial preferences.
- `id` (UUID, PK, FK `auth.users.id` ON DELETE CASCADE)
- `email` (TEXT, NOT NULL)
- `display_name` (TEXT)
- `typography_preference` (TEXT, CHECK IN ('serif', 'sans'), DEFAULT 'serif')
- `interface_density` (TEXT, CHECK IN ('comfortable', 'compact'), DEFAULT 'comfortable')
- `created_at`, `updated_at` (TIMESTAMPTZ)

### 2.2 `projects`
Authorial workspace boundary.
- `id` (UUID, PK, DEFAULT gen_random_uuid())
- `user_id` (UUID, FK `auth.users.id` ON DELETE CASCADE, NOT NULL)
- `title` (TEXT, NOT NULL)
- `genre` (TEXT)
- `description` (TEXT)
- `notes` (TEXT)
- `status` (TEXT, CHECK IN ('in_progress', 'completed', 'archived'), DEFAULT 'in_progress')
- `created_at`, `updated_at` (TIMESTAMPTZ)

### 2.3 `scenes`
Ordered manuscript chapters or narrative scenes.
- `id` (UUID, PK, DEFAULT gen_random_uuid())
- `project_id` (UUID, FK `projects.id` ON DELETE CASCADE, NOT NULL)
- `user_id` (UUID, FK `auth.users.id` ON DELETE CASCADE, NOT NULL)
- `title` (TEXT, NOT NULL)
- `description` (TEXT)
- `canonical_text` (TEXT, NOT NULL DEFAULT '')
- `word_count` (INTEGER, NOT NULL DEFAULT 0)
- `sort_order` (INTEGER, NOT NULL DEFAULT 0)
- `created_at`, `updated_at` (TIMESTAMPTZ)

### 2.4 `audio_assets`
Original spoken recordings or imported audio files.
- `id` (UUID, PK, DEFAULT gen_random_uuid())
- `project_id` (UUID, FK `projects.id` ON DELETE CASCADE, NOT NULL)
- `user_id` (UUID, FK `auth.users.id` ON DELETE CASCADE, NOT NULL)
- `title` (TEXT, NOT NULL)
- `storage_path` (TEXT, NOT NULL)
- `storage_bucket` (TEXT, NOT NULL DEFAULT 'audio_recordings')
- `mime_type` (TEXT, NOT NULL)
- `file_size_bytes` (BIGINT, NOT NULL)
- `duration_seconds` (NUMERIC(10, 2))
- `source_type` (TEXT, CHECK IN ('browser_recording', 'file_upload'), NOT NULL)
- `status` (TEXT, CHECK IN ('pending_verification', 'verified', 'transcribed', 'failed', 'deleted'), DEFAULT 'pending_verification')
- `created_at`, `updated_at` (TIMESTAMPTZ)

### 2.5 `transcripts` & `transcript_revisions`
- `transcripts`: Container for an audio asset's speech-to-text conversion.
  - `id` (UUID, PK, DEFAULT gen_random_uuid())
  - `audio_asset_id` (UUID, FK `audio_assets.id` ON DELETE CASCADE, NOT NULL)
  - `project_id` (UUID, FK `projects.id` ON DELETE CASCADE, NOT NULL)
  - `user_id` (UUID, FK `auth.users.id` ON DELETE CASCADE, NOT NULL)
  - `provider` (TEXT, NOT NULL) -- e.g. 'deepgram', 'whisper'
  - `model` (TEXT, NOT NULL) -- e.g. 'nova-3', 'whisper-1'
  - `raw_provider_response` (JSONB)
  - `current_revision_id` (UUID)
  - `created_at`, `updated_at` (TIMESTAMPTZ)
- `transcript_revisions`: Immutable history of the source transcript.
  - `id` (UUID, PK, DEFAULT gen_random_uuid())
  - `transcript_id` (UUID, FK `transcripts.id` ON DELETE CASCADE, NOT NULL)
  - `user_id` (UUID, FK `auth.users.id` ON DELETE CASCADE, NOT NULL)
  - `revision_number` (INTEGER, NOT NULL)
  - `text` (TEXT, NOT NULL)
  - `word_count` (INTEGER, NOT NULL DEFAULT 0)
  - `is_source` (BOOLEAN, NOT NULL DEFAULT false)
  - `edit_summary` (TEXT)
  - `created_at` (TIMESTAMPTZ)
  - UNIQUE(`transcript_id`, `revision_number`)

### 2.6 `story_context_items` & `vocabulary_items`
- `story_context_items`: Writer-controlled characters, locations, and facts.
  - `id` (UUID, PK, DEFAULT gen_random_uuid())
  - `project_id` (UUID, FK `projects.id` ON DELETE CASCADE, NOT NULL)
  - `user_id` (UUID, FK `auth.users.id` ON DELETE CASCADE, NOT NULL)
  - `type` (TEXT, CHECK IN ('Character', 'Location', 'Terminology', 'Approved story fact', 'Suggestion'), NOT NULL)
  - `name` (TEXT, NOT NULL)
  - `detail` (TEXT NOT NULL DEFAULT '')
  - `approved` (BOOLEAN, NOT NULL DEFAULT false) -- **Critical Gate: Only approved=true influences LLM**
  - `origin` (TEXT, CHECK IN ('writer_created', 'ai_suggested', 'imported'), DEFAULT 'writer_created')
  - `created_at`, `updated_at` (TIMESTAMPTZ)
- `vocabulary_items`: Phonetic hints and fictional proper nouns used for speech-to-text biasing.
  - `id` (UUID, PK, DEFAULT gen_random_uuid())
  - `project_id` (UUID, FK `projects.id` ON DELETE CASCADE, NOT NULL)
  - `user_id` (UUID, FK `auth.users.id` ON DELETE CASCADE, NOT NULL)
  - `term` (TEXT, NOT NULL)
  - `phonetic_hint` (TEXT)
  - `category` (TEXT DEFAULT 'general')

### 2.7 `drafts` & `draft_revisions`
Candidate manuscript transformations.
- `drafts`:
  - `id` (UUID, PK, DEFAULT gen_random_uuid())
  - `transformation_job_id` (UUID, FK `transformation_jobs.id` ON DELETE SET NULL)
  - `project_id` (UUID, FK `projects.id` ON DELETE CASCADE, NOT NULL)
  - `user_id` (UUID, FK `auth.users.id` ON DELETE CASCADE, NOT NULL)
  - `source_transcript_id` (UUID, FK `transcripts.id` ON DELETE RESTRICT, NOT NULL)
  - `source_revision_id` (UUID, FK `transcript_revisions.id` ON DELETE RESTRICT, NOT NULL)
  - `mode` (TEXT, CHECK IN ('faithful', 'clean', 'readable'), NOT NULL)
  - `current_revision_id` (UUID)
  - `status` (TEXT, CHECK IN ('candidate', 'accepted', 'rejected', 'archived'), DEFAULT 'candidate')
  - `accepted_scene_id` (UUID, FK `scenes.id` ON DELETE SET NULL)
  - `created_at`, `updated_at` (TIMESTAMPTZ)
- `draft_revisions`:
  - `id` (UUID, PK, DEFAULT gen_random_uuid())
  - `draft_id` (UUID, FK `drafts.id` ON DELETE CASCADE, NOT NULL)
  - `user_id` (UUID, FK `auth.users.id` ON DELETE CASCADE, NOT NULL)
  - `revision_number` (INTEGER, NOT NULL)
  - `text` (TEXT, NOT NULL)
  - `word_count` (INTEGER, NOT NULL DEFAULT 0)
  - `is_initial_llm_output` (BOOLEAN, NOT NULL DEFAULT false)
  - `author_type` (TEXT, CHECK IN ('llm', 'writer_edit', 'restored_source'), NOT NULL)
  - `edit_summary` (TEXT)
  - `created_at` (TIMESTAMPTZ)
  - UNIQUE(`draft_id`, `revision_number`)

### 2.8 `accepted_passages` & `approval_events`
The permanent record of writer acceptance.
- `accepted_passages`:
  - `id` (UUID, PK, DEFAULT gen_random_uuid())
  - `scene_id` (UUID, FK `scenes.id` ON DELETE CASCADE, NOT NULL)
  - `draft_id` (UUID, FK `drafts.id` ON DELETE RESTRICT, NOT NULL)
  - `draft_revision_id` (UUID, FK `draft_revisions.id` ON DELETE RESTRICT, NOT NULL)
  - `source_transcript_id` (UUID, FK `transcripts.id` ON DELETE RESTRICT, NOT NULL)
  - `source_revision_id` (UUID, FK `transcript_revisions.id` ON DELETE RESTRICT, NOT NULL)
  - `project_id` (UUID, FK `projects.id` ON DELETE CASCADE, NOT NULL)
  - `user_id` (UUID, FK `auth.users.id` ON DELETE CASCADE, NOT NULL)
  - `accepted_text` (TEXT, NOT NULL)
  - `word_count` (INTEGER, NOT NULL DEFAULT 0)
  - `position_index` (INTEGER, NOT NULL DEFAULT 0)
  - `created_at` (TIMESTAMPTZ)
- `approval_events`: Audit trail of explicit approvals.
  - `id` (UUID, PK, DEFAULT gen_random_uuid())
  - `project_id`, `user_id`, `scene_id`, `draft_id`, `draft_revision_id`, `accepted_passage_id`
  - `action` (TEXT, CHECK IN ('accepted_new_scene', 'accepted_append_scene'))
  - `word_count` (INTEGER)
  - `created_at` (TIMESTAMPTZ)

### 2.9 `processing_jobs` (Durable Queue)
- `id` (UUID, PK, DEFAULT gen_random_uuid())
- `job_type` (TEXT, CHECK IN ('audio_validation', 'transcription', 'transcript_postprocess', 'transformation', 'export_generation'), NOT NULL)
- `status` (TEXT, CHECK IN ('queued', 'processing', 'completed', 'failed', 'retrying', 'cancelled'), DEFAULT 'queued')
- `idempotency_key` (TEXT, UNIQUE, NOT NULL)
- `project_id` (UUID, FK `projects.id` ON DELETE CASCADE, NOT NULL)
- `user_id` (UUID, FK `auth.users.id` ON DELETE CASCADE, NOT NULL)
- `payload` (JSONB, NOT NULL DEFAULT '{}')
- `result` (JSONB)
- `attempts` (INTEGER, NOT NULL DEFAULT 0)
- `max_attempts` (INTEGER, NOT NULL DEFAULT 3)
- `last_error` (TEXT)
- `locked_by` (TEXT)
- `locked_until` (TIMESTAMPTZ)
- `scheduled_for` (TIMESTAMPTZ NOT NULL DEFAULT now())
- `completed_at` (TIMESTAMPTZ)
- `created_at`, `updated_at` (TIMESTAMPTZ)
