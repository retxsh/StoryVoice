# ADR 002: Authentication and Multi-Tenant Row Level Security

**Date:** 2026-11-22  
**Status:** Accepted  
**Deciders:** Security Engineer, Database Architect, Backend Lead

---

## Context
Fiction authors draft unpublished, confidential intellectual property in StoryVoice. In a multi-tenant cloud environment, a security bug in a route handler must never expose one writer's recordings, transcripts, or manuscript text to another writer.

## Decision
We enforce multi-tenant authorization through **PostgreSQL Row Level Security (RLS)** in tandem with server-side session checks:
1. Every table has an explicit `user_id UUID REFERENCES auth.users(id)` column (or cascades through parent project ownership).
2. `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` is enabled on all 17 canonical tables.
3. RLS policies restrict `SELECT`, `INSERT`, `UPDATE`, and `DELETE` strictly to `auth.uid() = user_id`.
4. Client requests are authenticated using Supabase SSR session cookies and verified on every server action and API route. Client-supplied IDs are never trusted as proof of ownership.
5. Storage buckets enforce RLS on the object path prefix: `auth.uid()::text = (storage.foldername(name))[1]`.

## Consequences
- **Positive:** Even if an API endpoint omits an application-level where clause, the database kernel prevents cross-tenant data leakage.
- **Negative:** Background worker processes require a distinct service role client (`SUPABASE_SERVICE_ROLE_KEY`) that bypasses RLS, requiring strict internal isolation and auditing in the worker codebase.
