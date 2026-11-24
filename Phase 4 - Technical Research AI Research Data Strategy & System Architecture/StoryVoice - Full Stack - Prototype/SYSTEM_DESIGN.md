# StoryVoice — System Design Document

**Status:** Approved  
**Version:** 1.0.0  
**Layer:** Core Systems & Services

---

## 1. Domain Decomposition

The StoryVoice modular monolith is divided into clear domain services:

```
src/
├── services/
│   ├── auth/              # Identity, session verification, user profile management
│   ├── project/           # Projects and metadata lifecycle
│   ├── scene/             # Scene organization, canonical manuscript text
│   ├── audio/             # Audio asset ingestion, direct-upload signing, validation
│   ├── transcription/     # STT provider adapters, transcript versioning
│   ├── transformation/    # LLM transformation modes, prompt building, validation
│   ├── context/           # Story context items, vocabulary, approval gates
│   ├── approval/          # Atomic acceptance transactions, draft rejection, restoration
│   └── export/            # DOCX, Markdown, and TXT document compilation
```

Each service communicates via strongly typed TypeScript interfaces and encapsulates direct database interaction through either Supabase query builders or transactional SQL procedures.

---

## 2. Subsystem Specifications

### 2.1 Audio Ingestion & Verification Subsystem
- **Direct-to-Storage Ingestion:** The client never uploads multi-megabyte audio files directly through the Next.js serverless route handler. Instead, the server issues a scoped signed upload URL targeting Supabase Storage.
- **Verification Phase:** Once client upload completes, the client posts `confirm-upload`. The server verifies:
  1. The file exists in storage at the declared path.
  2. The file byte size matches the client declaration (within a 5% tolerance to account for container metadata).
  3. The MIME type is in the allowed whitelist (`audio/webm`, `audio/mp4`, `audio/wav`, `audio/mpeg`, `audio/x-m4a`).
- Only after verification does the audio asset status transition to `verified`, triggering job creation.

### 2.2 Transcription Pipeline Subsystem
- **Abstraction:** `SpeechToTextAdapter` interface:
  ```typescript
  interface SpeechToTextAdapter {
    transcribe(params: {
      audioStream: ReadableStream | Buffer;
      mimeType: string;
      vocabulary: string[]; // Approved fiction terms
      language?: string;
    }): Promise<TranscriptionResult>;
  }
  ```
- **Provider Adapters:**
  - `DeepgramAdapter`: Uses Deepgram Nova-3 API with `smart_format=true`, `punctuate=true`, `keywords` injected from approved vocabulary items.
  - `OpenAIWhisperAdapter`: Uses OpenAI audio transcription API with `prompt` keyword biasing.
  - `MockTranscriptionAdapter`: Used in local development and integration tests.
- **Transcript Versioning:** The initial raw transcript is saved as `transcript_revisions` revision 1 (`is_source = true`). Any writer corrections create revision 2, 3, etc., preserving the entire correction history.

### 2.3 AI Transformation Subsystem
- **Three Transformation Modes:**
  1. **Faithful Transcript:** Formats spoken prose with punctuation and paragraph breaks without altering diction, sentence structure, or vocabulary.
  2. **Clean Transcript:** Strips filler words ("um", "uh", "you know"), cleans false starts, and smooths disfluencies while preserving the author's spoken cadence and unique dialogue.
  3. **Readable Draft:** Shapes rough spoken narrative into publishable prose paragraphs, tightening transitions and syntax while strictly preserving all events, actions, characters, and emotions.
- **Prompt Architecture:**
  - System prompts are versioned (`src/services/transformation/prompts/v1/`).
  - Context items are filtered: **Only approved items (`approved = true`) are passed to the model**.
  - System instructions include negative constraints forbidding the invention of characters, locations, or story events.
- **Structured Output:** Model responses are enforced using JSON schemas and validated server-side via Zod:
  ```typescript
  export const TransformationResponseSchema = z.object({
    transformed_text: z.string().min(1),
    transformation_mode: z.enum(["faithful", "clean", "readable"]),
    source_transcript_id: z.string().uuid(),
    source_revision_id: z.string().uuid(),
    prompt_version: z.string(),
    provider: z.string(),
    model: z.string(),
    context_references: z.array(z.string().uuid()),
    warnings: z.array(z.string()),
    validation_status: z.enum(["valid", "flagged_repetition", "flagged_hallucination"]),
  });
  ```

### 2.4 Atomic Acceptance & Lineage Subsystem
- **Problem:** Concurrent edits or double-clicks could corrupt scene text or create duplicate passages.
- **Solution:** PostgreSQL RPC `accept_draft_to_scene` executing in a serializable transaction with `FOR UPDATE` row locks:
  1. Validates user ownership.
  2. Compares `expected_draft_revision_id` against the current draft revision. If they differ, aborts with `STALE_DRAFT_CONFLICT`.
  3. Appends draft text to `scenes.canonical_text` or creates a new scene.
  4. Creates immutable `accepted_passages` record linking `draft_id`, `draft_revision_id`, `source_transcript_id`, `source_revision_id`.
  5. Records `approval_events` audit row.
  6. Marks draft `status = 'accepted'`.

### 2.5 Server-Side Export Subsystem
- **Format Generators:**
  - **DOCX:** Generates valid Open XML ZIP packages (`word/document.xml`, `_rels/.rels`, `[Content_Types].xml`, `word/styles.xml`) styled in Georgia 12pt with proper Title and Heading 1 styles.
  - **Markdown:** UTF-8 encoded text with clean `# Project` and `## Scene` headers.
  - **TXT:** Plain text formatted with double linebreaks between scenes.
- **Security:** Export files are stored in private storage bucket `exports/{user_id}/{project_id}/{export_id}.{format}` and accessed via signed URLs with 60-minute expiration.

---

## 3. Reliability, Concurrency & Failure Recovery

| Failure Scenario | Mitigation Mechanism |
|---|---|
| **Worker Crash during Transcription** | `locked_until` lease expires after 300 seconds. Another worker leases the job and retries up to `max_attempts` (3). |
| **STT Provider Rate Limit / 429** | Worker fails job with exponential backoff (`2 ^ attempts * 10s`) and transitions job to `retrying`. |
| **LLM Output Fails Schema Validation** | Job records `last_error = 'SCHEMA_VALIDATION_FAILURE'`, increments attempts, and retries. If permanently failed, user sees actionable failure with option to retry. |
| **Writer Edits Draft While Transformation Runs** | Draft versions are stored with monotonic revision numbers. An in-progress transformation creates revision 1; manual writer edits create revision 2 without clobbering. |
| **Stale Draft Acceptance** | The acceptance RPC checks the client's revision hash/ID against the database. Stale requests are rejected with a clear conflict response. |
