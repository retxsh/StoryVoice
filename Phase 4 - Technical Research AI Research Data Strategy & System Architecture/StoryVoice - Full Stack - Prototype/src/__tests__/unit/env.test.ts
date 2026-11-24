import { describe, it, expect } from "vitest";
import { env } from "@/lib/env";

describe("Environment Configuration", () => {
  it("loads valid default environment settings", () => {
    expect(env).toBeDefined();
    expect(env.NODE_ENV).toMatch(/development|test|production/);
    expect(env.NEXT_PUBLIC_APP_URL).toBeDefined();
    expect(env.STORAGE_AUDIO_BUCKET).toBe("audio_recordings");
    expect(env.STORAGE_EXPORTS_BUCKET).toBe("exports");
  });

  it("provides worker concurrency and lease defaults", () => {
    expect(env.WORKER_CONCURRENCY).toBeGreaterThanOrEqual(1);
    expect(env.WORKER_LEASE_SECONDS).toBeGreaterThanOrEqual(60);
    expect(env.WORKER_POLL_INTERVAL_MS).toBeGreaterThanOrEqual(500);
  });
});
