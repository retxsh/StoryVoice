# ADR 003: Durable Asynchronous Job Queue

**Date:** 2026-11-22  
**Status:** Accepted  
**Deciders:** Data & Infrastructure Engineer, Backend Lead

---

## Context
Audio transcription, LLM transformation, and manuscript exports are high-latency operations (ranging from 2 seconds to several minutes). Executing them synchronously in Next.js route handlers causes HTTP connection timeouts, browser disconnects, unhandled failures, and poor user feedback.

## Decision
We implement a **durable, PostgreSQL-backed asynchronous job queue** using the `processing_jobs` table and transactional row-level locking (`FOR UPDATE SKIP LOCKED`):
1. Web endpoints immediately enqueue a job and return `202 Accepted` with a durable `job_id`.
2. Workers lease jobs atomically via `lease_processing_jobs()` with a 300-second lock duration (`locked_until`).
3. Failed jobs follow exponential backoff (`scheduled_for = now() + (2 ^ attempts * 10) seconds`) up to `max_attempts` (3).
4. Permanent failure states persist detailed error logs for client diagnosis.

We reject introducing Redis / BullMQ or AWS SQS at this stage:
- PostgreSQL queue keeps infrastructure count at one database.
- Database backups atomically capture both domain state and in-flight job states.
- Performance is more than sufficient for thousands of concurrent writing sessions.

## Consequences
- **Positive:** Zero additional infrastructure services, complete transactional consistency with project records, crash resilience.
- **Negative:** Long-term scale (millions of jobs/day) would require table vacuuming and partitioning, at which point dedicated queue brokers (e.g. pg_mq or SQS) can be evaluated.
