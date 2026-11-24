-- StoryVoice Queue & Storage Helpers Migration
-- PostgreSQL / Supabase Compatible

-- ============================================================================
-- 1. STORAGE BUCKETS (Supabase Storage setup)
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('audio_recordings', 'audio_recordings', false, 262144000, ARRAY['audio/webm', 'audio/mp4', 'audio/x-m4a', 'audio/wav', 'audio/mpeg', 'audio/ogg']),
    ('exports', 'exports', false, 52428800, ARRAY['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/markdown', 'text/plain'])
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage RLS: audio_recordings bucket
-- Path convention: {user_id}/{project_id}/{audio_asset_id}.ext
CREATE POLICY "Users can upload own audio recordings"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'audio_recordings' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can read own audio recordings"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'audio_recordings' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete own audio recordings"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'audio_recordings' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Storage RLS: exports bucket
-- Path convention: {user_id}/{project_id}/{export_id}.ext
CREATE POLICY "Users can upload own exports"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'exports' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can read own exports"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'exports' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete own exports"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'exports' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- ============================================================================
-- 2. QUEUE LEASE AND TRANSITION FUNCTIONS
-- ============================================================================

-- Function for worker to atomically lease up to batch_size jobs
CREATE OR REPLACE FUNCTION public.lease_processing_jobs(
    p_worker_id TEXT,
    p_lease_seconds INTEGER DEFAULT 300,
    p_batch_size INTEGER DEFAULT 1
) RETURNS SETOF public.processing_jobs
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH available_jobs AS (
        SELECT id FROM public.processing_jobs
        WHERE (status IN ('queued', 'retrying'))
          AND (scheduled_for <= timezone('utc'::text, now()))
          AND (locked_until IS NULL OR locked_until < timezone('utc'::text, now()))
        ORDER BY scheduled_for ASC
        LIMIT p_batch_size
        FOR UPDATE SKIP LOCKED
    )
    UPDATE public.processing_jobs j
    SET status = 'processing',
        locked_by = p_worker_id,
        locked_until = timezone('utc'::text, now()) + (p_lease_seconds || ' seconds')::INTERVAL,
        attempts = j.attempts + 1,
        updated_at = timezone('utc'::text, now())
    FROM available_jobs a
    WHERE j.id = a.id
    RETURNING j.*;
END;
$$;

-- Function to mark a job completed
CREATE OR REPLACE FUNCTION public.complete_processing_job(
    p_job_id UUID,
    p_result JSONB DEFAULT '{}'
) RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE public.processing_jobs
    SET status = 'completed',
        result = p_result,
        completed_at = timezone('utc'::text, now()),
        locked_by = NULL,
        locked_until = NULL,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_job_id;
END;
$$;

-- Function to fail or retry a job
CREATE OR REPLACE FUNCTION public.fail_processing_job(
    p_job_id UUID,
    p_error_message TEXT,
    p_retry_delay_seconds INTEGER DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_attempts INTEGER;
    v_max_attempts INTEGER;
    v_delay INTEGER;
BEGIN
    SELECT attempts, max_attempts INTO v_attempts, v_max_attempts
    FROM public.processing_jobs
    WHERE id = p_job_id;

    IF v_attempts >= v_max_attempts THEN
        -- Exhausted retries -> permanently fail
        UPDATE public.processing_jobs
        SET status = 'failed',
            last_error = p_error_message,
            locked_by = NULL,
            locked_until = NULL,
            updated_at = timezone('utc'::text, now())
        WHERE id = p_job_id;
    ELSE
        -- Exponential backoff: default 2 ^ attempts * 10 seconds
        v_delay := COALESCE(p_retry_delay_seconds, POWER(2, v_attempts)::INTEGER * 10);
        UPDATE public.processing_jobs
        SET status = 'retrying',
            last_error = p_error_message,
            locked_by = NULL,
            locked_until = NULL,
            scheduled_for = timezone('utc'::text, now()) + (v_delay || ' seconds')::INTERVAL,
            updated_at = timezone('utc'::text, now())
        WHERE id = p_job_id;
    END IF;
END;
$$;
