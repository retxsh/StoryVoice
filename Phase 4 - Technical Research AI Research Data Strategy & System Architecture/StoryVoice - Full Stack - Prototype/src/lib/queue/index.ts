import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { JobType, JobStatus, Json } from "@/types/database";

export interface EnqueueJobParams {
  jobType: JobType;
  projectId: string;
  userId: string;
  idempotencyKey: string;
  payload: Record<string, Json>;
  scheduledFor?: Date;
}

export interface LeasedJob {
  id: string;
  job_type: JobType;
  status: JobStatus;
  project_id: string;
  user_id: string;
  payload: Record<string, Json>;
  attempts: number;
  max_attempts: number;
}

export class JobQueue {
  private static client = createAdminClient();

  /**
   * Enqueues a job idempotently. If a job with the same idempotencyKey exists,
   * returns the existing job ID without creating a duplicate.
   */
  static async enqueue(params: EnqueueJobParams): Promise<{ jobId: string; isNew: boolean }> {
    const { jobType, projectId, userId, idempotencyKey, payload, scheduledFor } = params;

    const { data: existing, error: checkError } = await this.client
      .from("processing_jobs")
      .select("id")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (checkError) {
      logger.error("Failed checking existing job by idempotency key", checkError);
      throw checkError;
    }

    if (existing) {
      logger.info("Idempotent job deduplication hit", { jobId: existing.id, idempotencyKey });
      return { jobId: existing.id, isNew: false };
    }

    const { data, error } = await this.client
      .from("processing_jobs")
      .insert({
        job_type: jobType,
        project_id: projectId,
        user_id: userId,
        idempotency_key: idempotencyKey,
        payload,
        scheduled_for: scheduledFor ? scheduledFor.toISOString() : new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) {
      logger.error("Failed enqueuing job", error, { idempotencyKey, jobType });
      throw error;
    }

    logger.info("Enqueued job successfully", { jobId: data.id, jobType });
    return { jobId: data.id, isNew: true };
  }

  /**
   * Worker method: leases up to batchSize available jobs using PostgreSQL row locking.
   */
  static async leaseJobs(workerId: string, leaseSeconds = 300, batchSize = 1): Promise<LeasedJob[]> {
    const { data, error } = await this.client.rpc("lease_processing_jobs", {
      p_worker_id: workerId,
      p_lease_seconds: leaseSeconds,
      p_batch_size: batchSize,
    });

    if (error) {
      logger.error("Failed leasing jobs from queue", error, { workerId });
      return [];
    }

    return (data || []) as LeasedJob[];
  }

  /**
   * Marks a job completed.
   */
  static async complete(jobId: string, result: Record<string, Json> = {}): Promise<void> {
    const { error } = await this.client.rpc("complete_processing_job", {
      p_job_id: jobId,
      p_result: result,
    });

    if (error) {
      logger.error("Failed completing job in queue", error, { jobId });
      throw error;
    }

    logger.info("Job marked completed", { jobId });
  }

  /**
   * Fails a job with exponential backoff retry or terminal failure.
   */
  static async fail(jobId: string, errorMessage: string, retryDelaySeconds?: number): Promise<void> {
    const { error } = await this.client.rpc("fail_processing_job", {
      p_job_id: jobId,
      p_error_message: errorMessage,
      p_retry_delay_seconds: retryDelaySeconds ?? null,
    });

    if (error) {
      logger.error("Failed reporting job failure", error, { jobId });
      throw error;
    }

    logger.warn("Job failed / scheduled for retry", { jobId, errorMessage });
  }
}
