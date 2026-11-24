# StoryVoice — Local Development & Environment Setup

---

## 1. Prerequisites
- Node.js 20+ LTS or Node.js 22
- npm 10+
- (Optional) Supabase CLI or Docker for local PostgreSQL

---

## 2. Setup Instructions

1. **Clone and Install Dependencies:**
   ```bash
   npm install
   ```

2. **Configure Environment Variables:**
   ```bash
   cp .env.example .env.local
   ```
   Fill in your Supabase project keys and provider API keys (Deepgram, OpenAI, Gemini). If keys are omitted in development, mock fallback adapters will automatically run to allow full UI and flow testing.

3. **Database Migrations:**
   Apply migrations to your local or remote Supabase instance:
   ```bash
   # Files in supabase/migrations/
   # 20261122000001_initial_schema.sql
   # 20261122000002_queue_helpers.sql
   ```

4. **Run Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the application.

5. **Run Background Worker (in separate terminal):**
   ```bash
   npm run worker
   ```

6. **Run Automated Test Suite:**
   ```bash
   npm test
   ```
