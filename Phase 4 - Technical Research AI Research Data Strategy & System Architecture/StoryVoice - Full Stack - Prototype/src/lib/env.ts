import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),

  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().default("http://127.0.0.1:54321"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).default("dummy_anon_key"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).default("dummy_service_role_key"),
  DATABASE_URL: z.string().optional(),

  // Storage
  STORAGE_AUDIO_BUCKET: z.string().default("audio_recordings"),
  STORAGE_EXPORTS_BUCKET: z.string().default("exports"),

  // Third-party API keys (optional in dev, required in prod)
  DEEPGRAM_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),

  // Worker
  WORKER_CONCURRENCY: z.coerce.number().default(2),
  WORKER_POLL_INTERVAL_MS: z.coerce.number().default(3000),
  WORKER_LEASE_SECONDS: z.coerce.number().default(300),
});

export type Env = z.infer<typeof envSchema>;

let parsedEnv: Env;

try {
  parsedEnv = envSchema.parse(process.env);
} catch (error) {
  if (process.env.NODE_ENV !== "test") {
    console.error("❌ Invalid environment variables configuration:", error);
  }
  // Fallback defaults for testing or bootstrap
  parsedEnv = envSchema.parse({
    NODE_ENV: process.env.NODE_ENV || "test",
    NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "dummy_anon_key",
    SUPABASE_SERVICE_ROLE_KEY: "dummy_service_role_key",
  });
}

export const env = parsedEnv;
