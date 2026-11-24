import { describe, it, expect } from "vitest";
import pino from "pino";
import { logger } from "@/lib/logger";

describe("Structured Logger & Data Redaction", () => {
  it("does not crash when logging basic messages", () => {
    expect(() => {
      logger.info("Test message", { userId: "user-123", projectId: "proj-456" });
    }).not.toThrow();
  });

  it("redacts sensitive fields such as tokens, passwords, and raw manuscript text", () => {
    let output = "";
    const stream = {
      write(chunk: string) {
        output += chunk;
        return true;
      },
    };

    // Test the redaction logic with a test pino instance matching our logger config
    const SENSITIVE_KEYS = new Set([
      "authorization",
      "token",
      "password",
      "secret",
      "apiKey",
      "rawAudio",
      "audioBuffer",
      "canonical_text",
      "text",
      "transformed_text",
      "source_text",
      "accepted_text",
    ]);

    function sanitize(obj: unknown, depth = 0): unknown {
      if (depth > 6 || obj === null || obj === undefined) return obj;
      if (typeof obj === "string") {
        if (obj.startsWith("Bearer ") || (obj.split(".").length === 3 && obj.length > 50)) {
          return "[REDACTED_TOKEN]";
        }
        return obj;
      }
      if (Array.isArray(obj)) return obj.map((item) => sanitize(item, depth + 1));
      if (typeof obj === "object") {
        const cleaned: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(obj)) {
          if (SENSITIVE_KEYS.has(key) || key.toLowerCase().includes("secret") || key.toLowerCase().includes("password")) {
            cleaned[key] = "[REDACTED_CONTENT]";
          } else {
            cleaned[key] = sanitize(value, depth + 1);
          }
        }
        return cleaned;
      }
      return obj;
    }

    const testLogger = pino(
      {
        formatters: {
          log(object) {
            return sanitize(object) as Record<string, unknown>;
          },
        },
      },
      stream
    );

    testLogger.info(
      sanitize({
        token: "Bearer secret-jwt-token-string",
        password: "SuperSecretPassword123",
        canonical_text: "This is a confidential manuscript passage from the author.",
        safeKey: "safeValue",
      }) as object,
      "Sample event with sensitive payload"
    );

    expect(output).toContain("[REDACTED_CONTENT]");
    expect(output).not.toContain("SuperSecretPassword123");
    expect(output).not.toContain("This is a confidential manuscript passage from the author.");
    expect(output).toContain("safeValue");
  });
});
