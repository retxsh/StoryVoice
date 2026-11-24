# StoryVoice — Unit Economics & Cost Attribution Model

**North Star Metric:** Weekly Accepted Draft Words  
**Evaluation Perspective:** Cost per accepted word, not just cost per raw API call.

---

## 1. Cost Drivers & Provider Pricing (November 2026)

| Service Layer | Provider / Model | Unit Cost | Average Usage / Scene (3 min audio) | Cost / Scene |
|---|---|---|---|---|
| **Audio Ingestion & Storage** | Supabase Private Storage | $0.021 / GB-mo | 3 MB audio file (~3 mins) | ~$0.00006 |
| **Speech-to-Text (STT)** | Deepgram Nova-3 | $0.0043 / min | 3 mins audio | $0.01290 |
| **AI Transformation (LLM)** | Gemini 2.5 Flash | $0.075 / 1M in, $0.30 / 1M out | ~1,200 tokens prompt + output | $0.00025 |
| **Alternative LLM** | Claude 3.5 Sonnet | $3.00 / 1M in, $15.00 / 1M out | ~1,200 tokens prompt + output | $0.01080 |
| **Database & Compute** | Managed Monolith + Worker | Fixed monthly base | Amortized over 1,000 scenes | ~$0.00500 |
| **Total Estimated Variable Cost** | Deepgram + Gemini Flash | — | Per accepted 500-word passage | **~$0.0182** |

---

## 2. Cost Attribution & Writer Correction Burden

A critical Phase 4 insight is that **cheaper is not necessarily better**:
- If a low-cost transformation requires the writer to spend 20 minutes correcting hallucinated words, the product fails its value proposition.
- We monitor:
  - `Cost per Accepted Draft Word`
  - `Draft Acceptance Rate` (ratio of generated drafts that are accepted vs rejected)
  - `Writer Correction Delta` (Levenshtein distance between raw LLM draft and final accepted scene text)
- All usage is recorded per-request in `usage_records` to monitor tenant consumption and prevent abuse.
