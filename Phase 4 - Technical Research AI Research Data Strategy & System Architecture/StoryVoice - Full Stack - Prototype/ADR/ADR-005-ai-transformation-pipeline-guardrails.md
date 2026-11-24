# ADR 005: AI Transformation Pipeline and Authorial Guardrails

**Date:** 2026-11-22  
**Status:** Accepted  
**Deciders:** AI/LLM Engineer, Product Engineer, Security Lead

---

## Context
A major risk for fiction writers using AI-assisted tools is the "runaway LLM": a model that silently hallucinates plot points, alters the narrative voice, or invents characters. StoryVoice must guarantee that the writer remains the sole authority over the manuscript.

## Decision
We establish five immutable engineering rules in the transformation pipeline:
1. **Source Transcript Untrusted & Delimited:** Speech transcripts are placed inside `<source_transcript>` tags. System instructions forbid prompt overrides embedded within transcripts.
2. **Approved Context Only:** Only `story_context_items` where `approved = true` are ever supplied in LLM prompts. Unapproved suggestions are excluded.
3. **Structured Response Schema:** All LLM outputs must conform to a strict JSON schema validated via Zod on the server. Freeform unvalidated text is rejected.
4. **Draft Immutability & Provenance:** Every draft is stored as an unaccepted draft revision with parent transcript ID, prompt version, model name, and context item IDs.
5. **No Autonomous Acceptance:** No AI model or background worker has permission to mark a draft as accepted. Only an authenticated HTTP request from the writer calling the atomic acceptance stored procedure can transition a draft into accepted manuscript content.

## Consequences
- **Positive:** High writer trust, zero hallucination bleed into accepted scenes, complete auditability.
- **Negative:** Requires strict prompt engineering and JSON validation handling on all supported models.
