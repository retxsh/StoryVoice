-- StoryVoice Canonical Schema Migration
-- Phase 4 Architecture & Phase 5 Engineering Foundation
-- PostgreSQL / Supabase Compatible

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. PROFILES (extends auth.users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    display_name TEXT,
    typography_preference TEXT DEFAULT 'serif' CHECK (typography_preference IN ('serif', 'sans')),
    interface_density TEXT DEFAULT 'comfortable' CHECK (interface_density IN ('comfortable', 'compact')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- ============================================================================
-- 2. PROJECTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    genre TEXT,
    description TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_projects_user_id ON public.projects(user_id);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own projects"
    ON public.projects FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 3. SCENES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.scenes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    canonical_text TEXT NOT NULL DEFAULT '',
    word_count INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_scenes_project_id ON public.scenes(project_id);
CREATE INDEX idx_scenes_user_id ON public.scenes(user_id);
ALTER TABLE public.scenes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own scenes"
    ON public.scenes FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 4. AUDIO ASSETS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.audio_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    storage_bucket TEXT NOT NULL DEFAULT 'audio_recordings',
    mime_type TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    duration_seconds NUMERIC(10, 2),
    source_type TEXT NOT NULL CHECK (source_type IN ('browser_recording', 'file_upload')),
    status TEXT NOT NULL DEFAULT 'pending_verification' CHECK (status IN ('pending_verification', 'verified', 'transcribed', 'failed', 'deleted')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_audio_assets_project ON public.audio_assets(project_id);
CREATE INDEX idx_audio_assets_user ON public.audio_assets(user_id);
ALTER TABLE public.audio_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own audio assets"
    ON public.audio_assets FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 5. TRANSCRIPTS & REVISIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.transcripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audio_asset_id UUID NOT NULL REFERENCES public.audio_assets(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    raw_provider_response JSONB,
    current_revision_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_transcripts_audio_asset ON public.transcripts(audio_asset_id);
CREATE INDEX idx_transcripts_project ON public.transcripts(project_id);
ALTER TABLE public.transcripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own transcripts"
    ON public.transcripts FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.transcript_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transcript_id UUID NOT NULL REFERENCES public.transcripts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    revision_number INTEGER NOT NULL,
    text TEXT NOT NULL,
    word_count INTEGER NOT NULL DEFAULT 0,
    is_source BOOLEAN NOT NULL DEFAULT false,
    edit_summary TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(transcript_id, revision_number)
);

CREATE INDEX idx_transcript_revisions_transcript ON public.transcript_revisions(transcript_id);
ALTER TABLE public.transcript_revisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own transcript revisions"
    ON public.transcript_revisions FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 6. STORY CONTEXT & VOCABULARY
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.story_context_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('Character', 'Location', 'Terminology', 'Approved story fact', 'Suggestion')),
    name TEXT NOT NULL,
    detail TEXT NOT NULL DEFAULT '',
    approved BOOLEAN NOT NULL DEFAULT false,
    origin TEXT NOT NULL DEFAULT 'writer_created' CHECK (origin IN ('writer_created', 'ai_suggested', 'imported')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_story_context_project ON public.story_context_items(project_id);
CREATE INDEX idx_story_context_approved ON public.story_context_items(project_id, approved);
ALTER TABLE public.story_context_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own story context"
    ON public.story_context_items FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.vocabulary_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    term TEXT NOT NULL,
    phonetic_hint TEXT,
    category TEXT DEFAULT 'general',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_vocabulary_project ON public.vocabulary_items(project_id);
ALTER TABLE public.vocabulary_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own vocabulary items"
    ON public.vocabulary_items FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 7. TRANSFORMATION JOBS, DRAFTS & REVISIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.transformation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    source_transcript_id UUID NOT NULL REFERENCES public.transcripts(id) ON DELETE RESTRICT,
    source_revision_id UUID NOT NULL REFERENCES public.transcript_revisions(id) ON DELETE RESTRICT,
    mode TEXT NOT NULL CHECK (mode IN ('faithful', 'clean', 'readable')),
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    prompt_version TEXT NOT NULL,
    context_item_ids UUID[] DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    latency_ms INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_transformation_jobs_project ON public.transformation_jobs(project_id);
ALTER TABLE public.transformation_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view and manage own transformation jobs"
    ON public.transformation_jobs FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transformation_job_id UUID REFERENCES public.transformation_jobs(id) ON DELETE SET NULL,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    source_transcript_id UUID NOT NULL REFERENCES public.transcripts(id) ON DELETE RESTRICT,
    source_revision_id UUID NOT NULL REFERENCES public.transcript_revisions(id) ON DELETE RESTRICT,
    mode TEXT NOT NULL CHECK (mode IN ('faithful', 'clean', 'readable')),
    current_revision_id UUID,
    status TEXT NOT NULL DEFAULT 'candidate' CHECK (status IN ('candidate', 'accepted', 'rejected', 'archived')),
    accepted_scene_id UUID REFERENCES public.scenes(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_drafts_project ON public.drafts(project_id);
CREATE INDEX idx_drafts_source ON public.drafts(source_transcript_id);
ALTER TABLE public.drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own drafts"
    ON public.drafts FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.draft_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draft_id UUID NOT NULL REFERENCES public.drafts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    revision_number INTEGER NOT NULL,
    text TEXT NOT NULL,
    word_count INTEGER NOT NULL DEFAULT 0,
    is_initial_llm_output BOOLEAN NOT NULL DEFAULT false,
    author_type TEXT NOT NULL CHECK (author_type IN ('llm', 'writer_edit', 'restored_source')),
    edit_summary TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(draft_id, revision_number)
);

CREATE INDEX idx_draft_revisions_draft ON public.draft_revisions(draft_id);
ALTER TABLE public.draft_revisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own draft revisions"
    ON public.draft_revisions FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 8. ACCEPTED PASSAGES & APPROVAL EVENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.accepted_passages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scene_id UUID NOT NULL REFERENCES public.scenes(id) ON DELETE CASCADE,
    draft_id UUID NOT NULL REFERENCES public.drafts(id) ON DELETE RESTRICT,
    draft_revision_id UUID NOT NULL REFERENCES public.draft_revisions(id) ON DELETE RESTRICT,
    source_transcript_id UUID NOT NULL REFERENCES public.transcripts(id) ON DELETE RESTRICT,
    source_revision_id UUID NOT NULL REFERENCES public.transcript_revisions(id) ON DELETE RESTRICT,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    accepted_text TEXT NOT NULL,
    word_count INTEGER NOT NULL DEFAULT 0,
    position_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_accepted_passages_scene ON public.accepted_passages(scene_id);
CREATE INDEX idx_accepted_passages_draft ON public.accepted_passages(draft_id);
ALTER TABLE public.accepted_passages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own accepted passages"
    ON public.accepted_passages FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.approval_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    scene_id UUID NOT NULL REFERENCES public.scenes(id) ON DELETE CASCADE,
    draft_id UUID NOT NULL REFERENCES public.drafts(id) ON DELETE RESTRICT,
    draft_revision_id UUID NOT NULL REFERENCES public.draft_revisions(id) ON DELETE RESTRICT,
    accepted_passage_id UUID NOT NULL REFERENCES public.accepted_passages(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('accepted_new_scene', 'accepted_append_scene')),
    word_count INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_approval_events_project ON public.approval_events(project_id);
ALTER TABLE public.approval_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own approval events"
    ON public.approval_events FOR SELECT
    USING (auth.uid() = user_id);

-- ============================================================================
-- 9. DURABLE PROCESSING QUEUE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.processing_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type TEXT NOT NULL CHECK (job_type IN ('audio_validation', 'transcription', 'transcript_postprocess', 'transformation', 'export_generation')),
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'retrying', 'cancelled')),
    idempotency_key TEXT UNIQUE NOT NULL,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    payload JSONB NOT NULL DEFAULT '{}',
    result JSONB,
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    last_error TEXT,
    locked_by TEXT,
    locked_until TIMESTAMPTZ,
    scheduled_for TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_processing_jobs_status_scheduled ON public.processing_jobs(status, scheduled_for)
    WHERE status IN ('queued', 'retrying');
CREATE INDEX idx_processing_jobs_user ON public.processing_jobs(user_id);
ALTER TABLE public.processing_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own processing jobs"
    ON public.processing_jobs FOR SELECT
    USING (auth.uid() = user_id);

-- ============================================================================
-- 10. EXPORTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    scope TEXT NOT NULL CHECK (scope IN ('scene', 'project')),
    scene_id UUID REFERENCES public.scenes(id) ON DELETE SET NULL,
    format TEXT NOT NULL CHECK (format IN ('docx', 'md', 'txt')),
    storage_path TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL DEFAULT 0,
    word_count INTEGER NOT NULL DEFAULT 0,
    download_url_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_exports_project ON public.exports(project_id);
ALTER TABLE public.exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view and manage own exports"
    ON public.exports FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 11. USAGE & AUDIT LOGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.usage_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    service_type TEXT NOT NULL CHECK (service_type IN ('stt', 'llm', 'storage')),
    provider TEXT NOT NULL,
    model TEXT,
    units_consumed NUMERIC(12, 4) NOT NULL DEFAULT 0, -- seconds of audio, tokens, or MB-months
    unit_type TEXT NOT NULL CHECK (unit_type IN ('seconds', 'tokens', 'bytes')),
    estimated_cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_usage_records_user ON public.usage_records(user_id, created_at);
ALTER TABLE public.usage_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage records"
    ON public.usage_records FOR SELECT
    USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_audit_events_user ON public.audit_events(user_id, created_at);
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own audit events"
    ON public.audit_events FOR SELECT
    USING (auth.uid() = user_id);

-- ============================================================================
-- 12. STORED PROCEDURE: ATOMIC DRAFT ACCEPTANCE
-- ============================================================================
CREATE OR REPLACE FUNCTION public.accept_draft_to_scene(
    p_user_id UUID,
    p_project_id UUID,
    p_draft_id UUID,
    p_expected_draft_revision_id UUID,
    p_destination_mode TEXT, -- 'new' or 'existing'
    p_existing_scene_id UUID,
    p_new_scene_title TEXT,
    p_new_scene_description TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_draft RECORD;
    v_latest_revision RECORD;
    v_target_scene_id UUID;
    v_target_scene RECORD;
    v_new_canonical_text TEXT;
    v_new_word_count INTEGER;
    v_accepted_passage_id UUID;
    v_passage_index INTEGER := 0;
BEGIN
    -- 1. Verify project ownership
    IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = p_project_id AND user_id = p_user_id) THEN
        RAISE EXCEPTION 'Unauthorized or invalid project';
    END IF;

    -- 2. Fetch and lock draft
    SELECT * INTO v_draft FROM public.drafts 
    WHERE id = p_draft_id AND project_id = p_project_id AND user_id = p_user_id
    FOR UPDATE;

    IF v_draft IS NULL THEN
        RAISE EXCEPTION 'Draft not found';
    END IF;

    -- 3. Fetch latest draft revision
    SELECT * INTO v_latest_revision FROM public.draft_revisions
    WHERE draft_id = p_draft_id
    ORDER BY revision_number DESC
    LIMIT 1;

    IF v_latest_revision IS NULL THEN
        RAISE EXCEPTION 'No revisions found for draft';
    END IF;

    -- Stale check: draft revision must match client expected revision
    IF v_latest_revision.id <> p_expected_draft_revision_id THEN
        RAISE EXCEPTION 'STALE_DRAFT_CONFLICT: The draft has been updated since you viewed it';
    END IF;

    -- 4. Handle scene destination
    IF p_destination_mode = 'new' THEN
        INSERT INTO public.scenes (project_id, user_id, title, description, canonical_text, word_count)
        VALUES (
            p_project_id,
            p_user_id,
            COALESCE(NULLIF(TRIM(p_new_scene_title), ''), 'Untitled Scene'),
            p_new_scene_description,
            v_latest_revision.text,
            v_latest_revision.word_count
        ) RETURNING id INTO v_target_scene_id;
        v_passage_index := 0;
    ELSIF p_destination_mode = 'existing' THEN
        SELECT * INTO v_target_scene FROM public.scenes
        WHERE id = p_existing_scene_id AND project_id = p_project_id AND user_id = p_user_id
        FOR UPDATE;

        IF v_target_scene IS NULL THEN
            RAISE EXCEPTION 'Target scene not found';
        END IF;

        v_target_scene_id := v_target_scene.id;
        v_new_canonical_text := CASE 
            WHEN TRIM(v_target_scene.canonical_text) = '' THEN v_latest_revision.text
            ELSE v_target_scene.canonical_text || E'\n\n' || v_latest_revision.text
        END;
        
        -- Approximate word count update
        v_new_word_count := cardinality(regexp_split_to_array(trim(v_new_canonical_text), '\s+'));

        SELECT COALESCE(MAX(position_index) + 1, 0) INTO v_passage_index
        FROM public.accepted_passages WHERE scene_id = v_target_scene_id;

        UPDATE public.scenes 
        SET canonical_text = v_new_canonical_text,
            word_count = v_new_word_count,
            updated_at = timezone('utc'::text, now())
        WHERE id = v_target_scene_id;
    ELSE
        RAISE EXCEPTION 'Invalid destination mode. Must be "new" or "existing"';
    END IF;

    -- 5. Create accepted passage record
    INSERT INTO public.accepted_passages (
        scene_id,
        draft_id,
        draft_revision_id,
        source_transcript_id,
        source_revision_id,
        project_id,
        user_id,
        accepted_text,
        word_count,
        position_index
    ) VALUES (
        v_target_scene_id,
        v_draft.id,
        v_latest_revision.id,
        v_draft.source_transcript_id,
        v_draft.source_revision_id,
        p_project_id,
        p_user_id,
        v_latest_revision.text,
        v_latest_revision.word_count,
        v_passage_index
    ) RETURNING id INTO v_accepted_passage_id;

    -- 6. Record approval event
    INSERT INTO public.approval_events (
        project_id,
        user_id,
        scene_id,
        draft_id,
        draft_revision_id,
        accepted_passage_id,
        action,
        word_count
    ) VALUES (
        p_project_id,
        p_user_id,
        v_target_scene_id,
        v_draft.id,
        v_latest_revision.id,
        v_accepted_passage_id,
        CASE WHEN p_destination_mode = 'new' THEN 'accepted_new_scene' ELSE 'accepted_append_scene' END,
        v_latest_revision.word_count
    );

    -- 7. Update draft status
    UPDATE public.drafts
    SET status = 'accepted',
        accepted_scene_id = v_target_scene_id,
        updated_at = timezone('utc'::text, now())
    WHERE id = v_draft.id;

    RETURN jsonb_build_object(
        'success', true,
        'scene_id', v_target_scene_id,
        'accepted_passage_id', v_accepted_passage_id,
        'word_count', v_latest_revision.word_count
    );
END;
$$;
