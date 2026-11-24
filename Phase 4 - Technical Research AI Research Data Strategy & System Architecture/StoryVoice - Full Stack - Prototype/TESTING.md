# StoryVoice — Testing Strategy & Test Suites

**Framework:** Vitest + React Testing Library  
**Target:** Unit, Integration, Failure, and Acceptance Verification

---

## 1. Test Categories & Coverage

### 1.1 Unit Tests (`src/__tests__/unit/`)
- Domain validation rules (scene, project, audio metadata).
- Structured output schema parsing & Zod guardrails.
- Word count and change calculation utilities.
- Safe structured logging & PII/manuscript redaction.
- Stored procedure logic simulations.

### 1.2 Integration Tests (`src/__tests__/integration/`)
- Provider adapter contracts (STT Deepgram/Whisper adapters, LLM transformation adapters).
- Queue leasing, completion, and failure state transitions.
- Server-side DOCX Open XML, Markdown, and TXT export generators.
- Supabase RLS policy enforcement and ownership validation.

### 1.3 Failure & Edge-Case Tests (`src/__tests__/failure/`)
- Stale draft acceptance conflict handling.
- Worker timeout and lease recovery.
- Network interruption and upload resumption.
- Transcription provider failure with uncorrupted source recordings.
- LLM schema divergence with safe fallback.

---

## 2. Running Tests
```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch
```
