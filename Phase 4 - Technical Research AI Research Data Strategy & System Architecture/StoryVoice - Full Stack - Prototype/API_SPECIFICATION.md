# StoryVoice — API Specification

**Version:** 1.0.0  
**Base URL:** `/api`  
**Authentication:** Bearer token or Supabase Auth session cookie.  
**Security Headers:** `Content-Type: application/json`, `X-Content-Type-Options: nosniff`.

---

## 1. Authentication & Profile
- `GET /api/auth/me`
  - Returns current user profile and session status.
- `PATCH /api/auth/profile`
  - Body: `{ display_name?: string, typography_preference?: "serif" | "sans", interface_density?: "comfortable" | "compact" }`

---

## 2. Projects
- `GET /api/projects`
  - Returns array of projects owned by the authenticated writer.
- `POST /api/projects`
  - Body: `{ title: string, genre?: string, description?: string, notes?: string }`
  - Returns: Created project object with 201 Created.
- `GET /api/projects/[id]`
  - Returns project details, scene count, and summary statistics.
- `PATCH /api/projects/[id]`
  - Body: `{ title?: string, genre?: string, description?: string, notes?: string, status?: string }`
- `DELETE /api/projects/[id]`
  - Cascades deletion of all associated audio, drafts, and scenes.

---

## 3. Scenes
- `GET /api/projects/[projectId]/scenes`
  - Returns ordered list of accepted scenes for the project.
- `POST /api/projects/[projectId]/scenes`
  - Body: `{ title: string, description?: string, canonical_text?: string }`
- `GET /api/projects/[projectId]/scenes/[sceneId]`
  - Returns scene details, canonical text, word count, and accepted passages list.
- `PATCH /api/projects/[projectId]/scenes/[sceneId]`
  - Body: `{ title?: string, description?: string, canonical_text?: string }`

---

## 4. Audio Ingestion & Verification
- `POST /api/audio/request-upload`
  - Body: `{ projectId: string, title: string, mimeType: string, fileSizeBytes: number, sourceType: "browser_recording" | "file_upload" }`
  - Response: `{ audioAssetId: string, signedUploadUrl: string, storagePath: string }`
- `POST /api/audio/confirm-upload`
  - Body: `{ audioAssetId: string }`
  - Verifies object in Supabase Storage, sets status to `verified`, automatically enqueues transcription job.
  - Response: `{ success: true, jobId: string }`
- `GET /api/audio/[audioAssetId]`
  - Returns audio asset metadata and signed playback URL (60-minute expiry).

---

## 5. Transcription
- `POST /api/transcription/start`
  - Body: `{ audioAssetId: string, provider?: "deepgram" | "whisper" }`
  - Returns: `{ jobId: string, status: "queued" }`
- `GET /api/transcripts/[transcriptId]`
  - Returns transcript, current revision, and revision history.
- `POST /api/transcripts/[transcriptId]/revisions`
  - Body: `{ text: string, editSummary?: string }`
  - Saves writer correction to source transcript as a new revision.

---

## 6. Transformation
- `POST /api/transformation/start`
  - Body: `{ transcriptRevisionId: string, mode: "faithful" | "clean" | "readable", useContext: boolean }`
  - Enqueues transformation job with writer-approved context.
  - Response: `{ jobId: string, status: "queued" }`
- `GET /api/drafts/[draftId]`
  - Returns draft details, mode, latest revision, and source transcript reference.
- `GET /api/drafts/[draftId]/revisions`
  - Returns complete revision history for the draft.
- `POST /api/drafts/[draftId]/revisions`
  - Body: `{ text: string, editSummary?: string }`
  - Saves writer's manual edit to the draft before acceptance.

---

## 7. Approval & Scene Acceptance
- `POST /api/approval/accept`
  - Body:
    ```json
    {
      "projectId": "uuid",
      "draftId": "uuid",
      "expectedDraftRevisionId": "uuid",
      "destinationMode": "new" | "existing",
      "existingSceneId": "uuid | null",
      "newSceneTitle": "string | null",
      "newSceneDescription": "string | null"
    }
    ```
  - Calls atomic stored procedure `accept_draft_to_scene`.
  - Response: `{ success: true, sceneId: string, acceptedPassageId: string, wordCount: number }`
- `POST /api/approval/reject`
  - Body: `{ draftId: string }`
  - Marks draft as rejected without touching source transcript.

---

## 8. Story Context & Vocabulary
- `GET /api/projects/[projectId]/context`
  - Returns all context items (Characters, Locations, Facts).
- `POST /api/projects/[projectId]/context`
  - Body: `{ type: string, name: string, detail?: string, approved: boolean }`
- `PATCH /api/projects/[projectId]/context/[itemId]`
  - Body: `{ name?: string, detail?: string, approved?: boolean }`
- `DELETE /api/projects/[projectId]/context/[itemId]`
  - Deletes context item.

---

## 9. Background Jobs Status
- `GET /api/jobs/[jobId]`
  - Returns current job status (`queued`, `processing`, `completed`, `failed`, `retrying`), progress, result, or error message.

---

## 10. Document Export
- `POST /api/export`
  - Body: `{ projectId: string, scope: "scene" | "project", sceneId?: string, format: "docx" | "md" | "txt" }`
  - Returns: `{ exportId: string, downloadUrl: string, wordCount: number }`
