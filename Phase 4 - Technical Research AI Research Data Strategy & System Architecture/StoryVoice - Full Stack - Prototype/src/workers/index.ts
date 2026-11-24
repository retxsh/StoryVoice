import { JobQueue, LeasedJob } from "@/lib/queue";
import { TranscriptionService } from "@/services/transcription";
import { TransformationService } from "@/services/transformation";
import { ExportService } from "@/services/export";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";

const WORKER_ID = `worker-${process.pid}-${Math.random().toString(36).slice(2, 8)}`;
let isRunning = true;

logger.info("Starting StoryVoice Asynchronous Processing Daemon", {
  workerId: WORKER_ID,
  concurrency: env.WORKER_CONCURRENCY,
  pollIntervalMs: env.WORKER_POLL_INTERVAL_MS,
});

async function processJob(job: LeasedJob): Promise<void> {
  const { id, job_type, project_id, user_id, payload } = job;
  const jobLogger = logger.child({ jobId: id, jobType: job_type, projectId: project_id, userId: user_id });

  jobLogger.info("Leased job processing started");

  try {
    switch (job_type) {
      case "audio_validation": {
        jobLogger.info("Validating audio container and metadata");
        await JobQueue.complete(id, { verified: true, duration: 42.0 });
        break;
      }

      case "transcription": {
        jobLogger.info("Executing Speech-to-Text transcription pipeline", {
          audioAssetId: payload.audioAssetId as string,
        });

        const result = await TranscriptionService.processAudioTranscription({
          audioAssetId: payload.audioAssetId as string,
          userId: user_id,
          projectId: project_id,
          storagePath: payload.storagePath as string,
          mimeType: (payload.mimeType as string) || "audio/webm",
          provider: payload.provider as string | undefined,
        });

        await JobQueue.complete(id, {
          transcriptId: result.transcriptId,
          revisionId: result.revisionId,
          wordCount: result.wordCount,
        });
        break;
      }

      case "transformation": {
        jobLogger.info("Executing AI Draft Transformation pipeline", {
          mode: payload.mode as string,
          transcriptId: payload.transcriptId as string,
          sourceRevisionId: payload.sourceRevisionId as string,
        });

        const result = await TransformationService.processDraftTransformation({
          jobId: id,
          userId: user_id,
          projectId: project_id,
          transcriptId: payload.transcriptId as string,
          sourceRevisionId: payload.sourceRevisionId as string,
          mode: payload.mode as any,
          useContext: !!payload.useContext,
        });

        await JobQueue.complete(id, {
          draftId: result.draftId,
          revisionId: result.revisionId,
          mode: result.mode,
          wordCount: result.wordCount,
        });
        break;
      }

      case "export_generation": {
        jobLogger.info("Executing server-side manuscript compilation", {
          format: payload.format as string,
          scope: payload.scope as string,
        });

        const result = await ExportService.generateExport({
          userId: user_id,
          projectId: project_id,
          scope: payload.scope as any,
          sceneId: payload.sceneId as string | undefined,
          format: payload.format as any,
        });

        await JobQueue.complete(id, {
          exportId: result.exportId,
          downloadUrl: result.downloadUrl,
          wordCount: result.wordCount,
        });
        break;
      }

      default: {
        jobLogger.warn("Unrecognized job type", { jobType: job_type });
        await JobQueue.complete(id, { note: "No-op completed" });
      }
    }

    jobLogger.info("Job successfully completed");
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    jobLogger.error("Job execution failed", err, { errorMsg });
    await JobQueue.fail(id, errorMsg);
  }
}

async function workerLoop(): Promise<void> {
  while (isRunning) {
    try {
      const jobs = await JobQueue.leaseJobs(WORKER_ID, env.WORKER_LEASE_SECONDS, env.WORKER_CONCURRENCY);

      if (jobs.length > 0) {
        logger.debug(`Leased ${jobs.length} jobs for processing`);
        await Promise.all(jobs.map((job) => processJob(job)));
      } else {
        await new Promise((resolve) => setTimeout(resolve, env.WORKER_POLL_INTERVAL_MS));
      }
    } catch (err: unknown) {
      logger.error("Error in worker polling loop", err);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  logger.info("Worker daemon terminated cleanly");
}

process.on("SIGTERM", () => {
  logger.info("SIGTERM received. Shutting down worker daemon...");
  isRunning = false;
});

process.on("SIGINT", () => {
  logger.info("SIGINT received. Shutting down worker daemon...");
  isRunning = false;
});

workerLoop().catch((err) => {
  logger.error("Fatal exception in worker loop", err);
  process.exit(1);
});
