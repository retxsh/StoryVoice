# StoryVoice — Repository Audit and Phase 4/5 Migration Plan

**Date:** November 22, 2026  
**Auditor:** StoryVoice Engineering Team (Principal Software Architect, Frontend/Backend/DB/AI/Security/QA Leads)  
**Target Architecture:** Next.js App Router, React, TypeScript, Supabase (PostgreSQL, Auth, Storage), Asynchronous Node.js Processing Worker

---

## 1. Executive Summary

This audit assesses the current state of the StoryVoice codebase located in `Phase 3 - Product Design UX:UI & Experience Architecture/StoryVoice Prototype`.

The current implementation consists of a single standalone HTML document (`index.html`, 83.3 KB) and a developer guide (`README.md`). While it successfully showcases the 19 interaction screens of the Phase 3 UX design, all data persistence, audio processing, speech-to-text transcription, AI draft transformation, and multi-user authentication are purely simulated in browser memory.

Our objective is to transition this prototype into a production-ready, persistent, and AI-enabled application without regressing the editorial UX or compromising writer ownership over manuscript transformations.

---

## 2. Codebase & Asset Inventory

| Asset / Path | Type | Size / Lines | Current Responsibility | Target Migration Strategy |
|---|---|---|---|---|
| `index.html` | HTML5 / CSS3 / ES2020 | 83.3 KB (262 lines) | Standalone prototype: UI layout, styles, mock state, mock renderers, export scripts | Preserve as UI reference; migrate components and styles to Next.js App Router |
| `README.md` | Markdown | 13.5 KB (259 lines) | Phase 3 Developer Guide and manual test matrix | Retain and update to reflect Phase 4/5 full-stack architecture |
| Embedded CSS | CSS (in `index.html`) | ~380 lines | Design tokens (`--ink`, `--paper`, `--blue`, etc.), responsive styles, components | Migrate into `globals.css` and modular CSS / component styles, keeping token fidelity |
| Embedded JS | Vanilla JS | ~850 lines | In-memory `state`, 19 renderers, mock timers, simulated transformations, DOM listeners | Migrate into React components, Next.js server actions / API route handlers, and domain services |

---

## 3. Technology Stack Comparison

| Architectural Layer | Current Phase 3 Implementation | Phase 4 / 5 Target Engineering Foundation | Justification |
|---|---|---|---|
| **Language & Runtime** | Vanilla JavaScript (ES2020), Browser Runtime | TypeScript 5+, Node.js 22 LTS | Strict compile-time type safety for complex manuscript version lineage and API contracts |
| **Frontend Framework** | Direct DOM manipulation (`innerHTML`, template strings) | Next.js 15 App Router + React 19 | Server-side rendering, layout nesting, granular reactivity, zero-FOUC, accessible routing |
| **Styling & Tokens** | Embedded CSS in `<style>` tag | Preserved CSS custom properties + modular styling | Exact preservation of approved editorial palette (#20242B, #FAF9F6, #456B8A, etc.) |
| **Authentication** | Simulated profile (avatar "W", no auth) | Supabase Auth (Email magic link, Google OAuth) | Multi-tenant isolation, cryptographically verified user identity, session management |
| **Database & Persistence**| Global JS `state` (cleared on refresh) | PostgreSQL 16 (via Supabase) with RLS | Relational integrity, atomic acceptance transactions, version lineage, data permanence |
| **File Storage** | None (audio file selected via input, not stored) | Private Supabase Storage (`audio_recordings`, `exports`) | Encrypted, access-controlled storage for raw audio assets and generated exports |
| **Background Processing** | Client `setTimeout` simulated states | Durable PostgreSQL-backed Job Queue + Async Worker | Reliable async transcription and LLM inference, preventing timeout in web tier |
| **Speech-to-Text** | Predefined sample text (`SOURCE` string) | Provider-agnostic STT adapter (OpenAI Whisper, Deepgram Nova-3) | Real audio transcription with fiction vocabulary handling and audio chunk validation |
| **AI Transformation** | Hardcoded regex and strings (`modeOutput()`) | Multi-LLM adapter with Zod structured output | Genuine Faithful, Clean, and Readable prose generation with strict authorial guardrails |
| **Document Export** | Client-side pure JS ZIP generator (`buildDocx`) | Server-side DOCX, Markdown, and TXT generation | Validated Office Open XML packaging, UTF-8 formatting, download URL signing |

---

## 4. Phase 3 Screen to Target Component Mapping

| Screen / Flow | Phase 3 Renderer | Target Next.js Route / Component | Real Integration Needed |
|---|---|---|---|
| Projects List | `projectsPage()` | `/projects` (`page.tsx`) | `projects` table query filtered by authenticated `user_id` |
| Create Project | `createPage()` | `/projects/new` (`page.tsx`) | Server action to create row in `projects` with validation |
| Project Workspace | `workspacePage()` | `/projects/[id]/workspace` | Aggregated query: scenes, audio assets, active draft status |
| Capture Choice | `capturePage()` | `/projects/[id]/capture` | Routing choice between `/record` and `/import` |
| Audio Recorder | `recorderPage()` | `/projects/[id]/capture/record` | Web MediaRecorder API, live audio waveform, direct S3/Supabase upload |
| Audio Import | `importPage()` | `/projects/[id]/capture/import` | Drag-and-drop file picker, MIME check, signed upload to storage |
| Audio Ingestion Progress| `importingPage()` | Background Job Status Component | Queue job polling/subscriptions for upload verification |
| Transcription Progress | `transcribingPage()` | Background Job Status Component | Queue job polling/subscriptions for STT progress |
| Source Transcript Review| `transcriptPage()` | `/projects/[id]/transcript/[transId]` | Real transcript fetch, audio player with signed playback URL, revision save |
| Transformation Setup | `transformPage()` | `/projects/[id]/transform` | Mode selection (Faithful, Clean, Readable), approved context selector |
| Draft Processing | `processingPage()` | Background Job Status Component | Transformation job polling, latency tracking, retry handling |
| Source / Draft Review | `reviewPage()` | `/projects/[id]/review/[draftId]` | Side-by-side diff comparison, word count delta, lineage provenance |
| Draft Editor | `editorPage()` | `/projects/[id]/editor/[draftId]` | Long-form writing surface, debounce autosave, unsaved change warning |
| Accept & Organise | `organisePage()` | `/projects/[id]/organise/[draftId]` | Server-side atomic transaction: append/create scene, record approval event |
| Accepted Scene View | `scenePage()` | `/projects/[id]/scenes/[sceneId]` | Read accepted manuscript text, scene word count, history details |
| Edit Accepted Scene | `editScenePage()` | `/projects/[id]/scenes/[sceneId]/edit` | Dedicated manuscript editor updating `scenes` table |
| Story Context Shelf | `contextPage()` | `/projects/[id]/context` | CRUD for `story_context_items` with writer approval toggle |
| Export Manuscript | `exportPage()` | `/projects/[id]/export` | Server-side generation of DOCX, Markdown, TXT with signed download links |
| Settings & Preferences | `settingsPage()` | `/settings` | Real user profile, typography preference, account deletion/retention |

---

## 5. Simulated Features & Target Real Integrations

1. **Audio Capture & Storage:**
   - *Current:* Pure visual timer and CSS bar animation (`seconds++`). File input does not upload.
   - *Target:* `navigator.mediaDevices.getUserMedia` using standard MIME types (`audio/webm;codecs=opus`, `audio/mp4`, `audio/wav`). Binary streaming to Supabase Storage via signed resumable URLs. Verification on server before creating `audio_assets` record.

2. **Transcription Pipeline:**
   - *Current:* 850ms timeout setting `state.source = SOURCE`.
   - *Target:* Enqueue `transcription` job in `processing_jobs`. Separate worker picks up job, streams audio to Speech-to-Text provider adapter (Deepgram Nova-3 / OpenAI Whisper), parses word-level timings, creates `transcripts` and initial `transcript_revisions`.

3. **Transformation Pipeline:**
   - *Current:* `modeOutput()` regex replacing "um", "uh", "I mean".
   - *Target:* Enqueue `transformation` job. Worker loads exact source transcript revision, approved story context items, constructs strict system/user prompts, calls LLM provider, validates response against Zod schema, saves `drafts` and `draft_revisions` records.

4. **Approval & Manuscript Integrity:**
   - *Current:* In-memory push to `state.scenes`.
   - *Target:* PostgreSQL transactional RPC/function (`accept_draft_to_scene`) that verifies ownership, locks the draft revision, prevents concurrent stale acceptance, creates `accepted_passages`, creates `approval_events`, and updates `scenes`.

5. **Story Context & Guardrails:**
   - *Current:* `sampleContext` array stored in local state.
   - *Target:* Relational storage in `story_context_items`. Strict gate: only items with `approved = true` are injected into LLM prompts. Every transformation records `context_references` for full auditability.

6. **Document Export:**
   - *Current:* In-memory text concatenation and client-side ZIP building.
   - *Target:* Server-side endpoint `/api/export` generating valid Open XML DOCX, GitHub-Flavored Markdown, or clean TXT from canonical `scenes` text, storing output in private bucket and serving a short-lived signed download URL (60-minute expiry).

---

## 6. Critical Technical Debt & Implementation Risks

1. **Unsaved Edits Data Loss:**
   - *Risk:* In a SPA/Next.js environment, page transitions or network failures could discard in-progress transcript corrections or draft edits.
   - *Mitigation:* Implement debounced autosave to draft revisions, local session caching, and navigation interceptors (`beforeunload` + Next.js router blocker).

2. **LLM Hallucination and Over-Rewriting in Prose Modes:**
   - *Risk:* The "Readable Draft" mode could invent character actions, locations, or plot points that the author never spoke.
   - *Mitigation:* Strict system instructions forbidding fact introduction; server-side entity verification comparing source transcript entities with draft entities; writer acceptance as the absolute gate.

3. **Transcription Provider Fiction Name Corruption:**
   - *Risk:* Fictional names (e.g. "Mara Ellison", "Greyhaven") misinterpreted as common nouns.
   - *Mitigation:* Inject approved story context vocabulary as keyword hints / custom dictionary into STT provider requests (e.g. Deepgram `keywords`, Whisper `prompt`).

4. **Cross-Tenant Data Leakage:**
   - *Risk:* Accidental exposure of private fiction drafts or audio across writers.
   - *Mitigation:* Supabase Row Level Security (RLS) on all tables; foreign key cascade from `projects.user_id = auth.uid()`; storage bucket policies scoped strictly to `(storage.foldername(name))[1] = auth.uid()::text`.

5. **Long-Running Process Timeouts:**
   - *Risk:* Next.js serverless route handlers timing out during 5-minute audio transcriptions or multi-turn transformations.
   - *Mitigation:* Immediate return of `202 Accepted` with durable `job_id`. All heavy audio and LLM processing runs on a decoupled worker process.

---

## 7. Migration Roadmap

- **Stage 1 — Foundation (Current Focus):** Set up Next.js App Router, TypeScript, Supabase configuration, RLS policies, PostgreSQL migrations, structured logging, and base architecture docs.
- **Stage 2 — Data Architecture:** Complete database migrations, entity relationship definitions, and repository domain services.
- **Stage 3 — Audio Infrastructure:** Browser MediaRecorder capture module, private storage bucket configuration, and upload verification endpoints.
- **Stage 4 — Transcription Pipeline:** Worker job loop, STT provider adapters (OpenAI / Deepgram), and fiction vocabulary benchmarking.
- **Stage 5 — AI Transformation Pipeline:** Three prompt modes, structured output schemas, approved context injection, and draft history persistence.
- **Stage 6 — Writer Control & Acceptance:** Diff review interface, draft editor autosave, and atomic scene acceptance transactions.
- **Stage 7 — Export Service:** Server-side DOCX, Markdown, and TXT generation with file validation tests.
- **Stage 8 — Production Hardening & Testing:** Security audits, RLS penetration tests, cost attribution metrics, and E2E validation.
