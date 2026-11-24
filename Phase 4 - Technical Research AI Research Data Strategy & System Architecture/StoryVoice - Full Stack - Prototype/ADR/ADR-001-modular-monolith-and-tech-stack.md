# ADR 001: Modular Monolith and Technology Stack

**Date:** 2026-11-22  
**Status:** Accepted  
**Deciders:** Principal Software Architect, Senior Engineering Team

---

## Context
StoryVoice is transitioning from a client-only single-file prototype into a production-grade full-stack application. We need a modern, maintainable framework supporting server-rendered React, strict typing, relational database persistence, background asynchronous processing, and cloud storage.

## Decision
We adopt a **modular monolith** architecture consisting of:
1. **Frontend & Application Tier:** Next.js 15 (App Router), React 19, TypeScript.
2. **Backend & Persistence:** PostgreSQL 16 hosted via Supabase, with Supabase Auth and private Storage buckets.
3. **Background Worker:** A standalone Node.js/TypeScript daemon running worker loops for long-running STT, LLM, and export tasks.

We explicitly reject microservices:
- StoryVoice is an early-stage product where domain boundaries are still evolving.
- Distributed transactions would introduce excessive failure points into manuscript acceptance and audio processing.
- A modular monolith inside one repository guarantees type sharing (Zod schemas, database types) and single-command local development.

## Consequences
- **Positive:** Fast iteration, shared TypeScript types across API, DB, and client, atomic relational transactions, low operational complexity.
- **Negative:** The background worker requires its own deployment process or container alongside the Next.js web application.
