# StoryVoice — Deployment & Operations Guide

**Architecture:** Web Application (Next.js) + Background Processing Worker (Node.js)  
**Hosting Platforms:** Vercel / Railway / Fly.io + Supabase Managed Backend

---

## 1. Production Topology

```
[ DNS / Cloudflare ]
       │
       ├──> [ Web App ] (Next.js on Vercel / Managed Container)
       │         │
       │         └───> [ Supabase Managed Platform ]
       │                   ├── Auth Service
       │                   ├── PostgreSQL 16 (RLS Enabled)
       │                   └── Private Storage Buckets
       │                             ▲
       └──> [ Background Worker ] ───┘
            (Node.js Daemon on Railway / Fly.io)
                 │
                 ├── Deepgram Nova-3 API (STT)
                 └── LLM Provider API (Transformation)
```

---

## 2. Deployment Steps

### 2.1 Database Provisioning & Migrations
1. Create a Supabase project or PostgreSQL 16 database.
2. Run database migrations:
   ```bash
   npx supabase db push
   # or manually execute SQL files in supabase/migrations/
   ```
3. Verify storage buckets `audio_recordings` and `exports` are initialized with private visibility.

### 2.2 Web Application Deployment
1. Configure environment variables in the hosting provider (see `ENVIRONMENT_SETUP.md`).
2. Build command: `npm run build`
3. Output directory: `.next`
4. Start command: `npm run start`

### 2.3 Background Worker Deployment
1. Deploy as a standalone container or persistent worker process.
2. Start command: `npm run worker`
3. Configure worker concurrency (default `2`) and heartbeat interval.

---

## 3. Rollback Strategy
- Next.js zero-downtime atomic rollbacks via previous deployment hash.
- Database migrations are backward-compatible: additive schema changes only. Deprecated columns are soft-deprecated across one release cycle before removal.
