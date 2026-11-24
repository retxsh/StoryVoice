# StoryVoice — Privacy & Data Retention Policy

**Document Version:** 1.0.0  
**Scope:** Author Data, Audio Lifecycle, Manuscript Confidentiality

---

## 1. Confidentiality of Creative Work
Fiction authors entrust unfinished manuscripts, personal recordings, and creative ideas to StoryVoice. Confidentiality and data sovereignty are paramount.

- **No AI Training on Author Data:** StoryVoice explicitly contracts with LLM and STT enterprise endpoints where data is zero-data-retention (ZDR) and not used to train foundation models.
- **Author Ownership:** Authors retain 100% intellectual property ownership over all audio, transcripts, drafts, and accepted manuscripts.

---

## 2. Data Lifecycle & Retention Matrix

| Asset Type | Storage Location | Retention Policy | Writer Deletion Rights |
|---|---|---|---|
| **Original Audio** | Private Supabase Storage (`audio_recordings`) | Retained until explicitly deleted by writer | Immediate permanent deletion on request |
| **Source Transcripts** | PostgreSQL (`transcripts`, `transcript_revisions`) | Retained with project lifecycle | Deleted when project or audio asset is deleted |
| **Draft Revisions** | PostgreSQL (`drafts`, `draft_revisions`) | Retained with project lifecycle (max 50 revisions / draft) | Deleted when draft is rejected or project deleted |
| **Accepted Manuscript** | PostgreSQL (`scenes`, `accepted_passages`) | Canonical manuscript; permanent until author deletes | Full export and deletion rights |
| **Export Files** | Private Supabase Storage (`exports`) | 7 days retention; auto-purged by storage lifecycle | Immediate deletion upon request |
| **Queue Job Payloads** | PostgreSQL (`processing_jobs`) | Completed/Failed jobs purged after 30 days | Anonymized audit logs retained |

---

## 3. Account Deletion Workflow (Right to be Forgotten)
When a writer requests account deletion:
1. All projects, scenes, transcripts, drafts, and context items are removed via cascading foreign keys from `auth.users`.
2. All audio binaries and export files in Supabase Storage are permanently unlinked and deleted.
3. Third-party provider logs (Deepgram / OpenAI / Gemini) are governed by provider retention windows (typically zero-retention or 30-day transient debug logs).
