# StoryVoice — Voice-First Manuscript Drafting Environment

**Tagline:** Your voice. Your story.  
**Architecture:** Next.js 15 App Router, React 19, TypeScript, PostgreSQL (Supabase), Private Object Storage, Asynchronous Background Worker.  
**Reference Prototype:** `index.html` (Preserved Phase 3 client interaction prototype).

StoryVoice is a voice-first manuscript drafting environment for fiction writers. It enables authors to turn spoken scenes into accepted, organized manuscript text while maintaining absolute authority over every transformation.

---

## 1. Core Architectural Principle

> **The writer remains the authority over every meaningful transformation and every accepted piece of manuscript content.**

- The original audio recording, source transcript, draft revisions, and accepted manuscript passages are stored as separate immutable records.
- Transformations never overwrite source transcripts or recordings.
- Drafts never enter the manuscript until explicitly accepted by the author.
- AI inferences never become approved story facts without explicit author action.

---

## 2. Directory Structure

```text
StoryVoice/
├── index.html                   # Phase 3 standalone reference implementation
├── AUDIT_AND_MIGRATION_PLAN.md  # Comprehensive repository audit & migration plan
├── ARCHITECTURE.md              # Modular monolith & system topology
├── SYSTEM_DESIGN.md             # Subsystem designs & domain services
├── DATA_MODEL.md                # Canonical PostgreSQL schema & entity relationships
├── API_SPECIFICATION.md         # Documented REST API contracts
├── AI_ARCHITECTURE.md           # Speech-to-text & 3-mode transformation architecture
├── TRANSCRIPTION_BENCHMARK.md   # Fiction audio benchmarking (Deepgram Nova-3 / Whisper)
├── SECURITY.md                  # Row Level Security, authorization, and threat model
├── PRIVACY_AND_DATA_RETENTION.md# Author confidentiality & data lifecycle
├── DEPLOYMENT.md                # Web app & background worker hosting
├── ENVIRONMENT_SETUP.md         # Local development setup instructions
├── TESTING.md                   # Test suite specifications
├── COST_MODEL.md                # Unit economics & cost attribution
├── ADR/                         # Architecture Decision Records (001 - 005)
│   ├── ADR-001-modular-monolith-and-tech-stack.md
│   ├── ADR-002-authentication-and-multi-tenant-rls.md
│   ├── ADR-003-durable-asynchronous-job-queue.md
│   ├── ADR-004-speech-to-text-multi-provider-strategy.md
│   └── ADR-005-ai-transformation-pipeline-guardrails.md
├── supabase/
│   └── migrations/              # Production PostgreSQL migrations
│       ├── 20261122000001_initial_schema.sql
│       └── 20261122000002_queue_helpers.sql
├── src/
│   ├── app/                     # Next.js App Router (Layouts, Pages, Routes)
│   │   ├── (auth)/login/        # Real login & magic link page
│   │   ├── (auth)/signup/       # Real account registration
│   │   ├── auth/callback/       # OAuth & OTP session exchange
│   │   ├── projects/            # Real project catalog & creation
│   │   ├── settings/            # Author preferences
│   │   ├── globals.css          # Phase 3 editorial design tokens & layout
│   │   └── layout.tsx           # Application frame & responsive shell
│   ├── lib/
│   │   ├── env.ts               # Strict Zod environment validation
│   │   ├── logger/              # PII & manuscript-redacting structured logger
│   │   ├── queue/               # Durable PostgreSQL job queue interface
│   │   └── supabase/            # Browser, Server (SSR), and Admin clients
│   ├── types/
│   │   ├── database.ts          # Typed database tables, rows, and RPCs
│   │   └── domain.ts            # Zod validation schemas for domain entities
│   ├── workers/
│   │   └── index.ts             # Dedicated asynchronous background processing daemon
│   └── __tests__/
│       └── unit/                # Automated unit tests for domain & security rules
```

---

## 3. Quick Start

### 3.1 Prerequisites
- Node.js 20+ LTS or 22
- npm 10+

### 3.2 Installation & Setup
```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local

# 3. Run automated test suite
npm test

# 4. Start Next.js development server
npm run dev

# 5. Start background worker (in separate terminal)
npm run worker
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 4. Phase 3 Design Tokens Preserved

- **Ink:** `#20242B`
- **Paper:** `#FAF9F6`
- **Slate:** `#68717D`
- **Voice Blue:** `#456B8A`
- **Soft Blue:** `#E8EFF4`
- **Line:** `#E6E3DC`
- **Success:** `#3F765B`
- **Warning:** `#A56D2A`
- **Error:** `#A34848`
- **Manuscript Typography:** `Newsreader` (30/36 serif) & `DM Sans` (sans-serif)
