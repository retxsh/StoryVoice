# ADR 004: Speech-to-Text Multi-Provider Strategy

**Date:** 2026-11-22  
**Status:** Accepted  
**Deciders:** Speech Recognition Engineer, AI/LLM Engineer

---

## Context
Fiction transcription is highly sensitive to proper-noun recognition, dialogue rhythms, and emotional cadence. Direct lock-in to a single provider leaves StoryVoice vulnerable to provider downtime, breaking API changes, or unexpected pricing increases.

## Decision
We implement a provider-agnostic `SpeechToTextAdapter` interface:
1. **Primary Provider:** Deepgram Nova-3. Chosen for superior fiction name accuracy using `keywords` biasing, sub-2-second latency, and low unit economics ($0.0043/min).
2. **Secondary Provider:** OpenAI Whisper (whisper-1). Chosen for robust general accuracy and keyword biasing via prompt priming.
3. **Mock Provider:** Used in local unit testing and development environments where provider API keys are absent.

The database stores `provider` and `model` on every transcript record alongside the raw provider response, while normalizing output into canonical word timestamps and text.

## Consequences
- **Positive:** Flexibility to switch or fallback between providers without schema migrations or frontend changes.
- **Negative:** Maintaining multiple provider integrations and test fixtures.
