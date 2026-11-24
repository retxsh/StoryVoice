import pino from "pino";

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
  if (depth > 6 || obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === "string") {
    if (obj.startsWith("Bearer ") || (obj.split(".").length === 3 && obj.length > 50)) {
      return "[REDACTED_TOKEN]";
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitize(item, depth + 1));
  }

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

const baseLogger = pino({
  level: process.env.LOG_LEVEL || "info",
  formatters: {
    log(object) {
      return sanitize(object) as Record<string, unknown>;
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export interface LogContext {
  userId?: string;
  projectId?: string;
  jobId?: string;
  traceId?: string;
  [key: string]: unknown;
}

export interface LoggerInstance {
  debug(msg: string, context?: LogContext): void;
  info(msg: string, context?: LogContext): void;
  warn(msg: string, context?: LogContext): void;
  error(msg: string, err?: unknown, context?: LogContext): void;
  child(context: LogContext): LoggerInstance;
}

function createLoggerInstance(pinoInstance: pino.Logger): LoggerInstance {
  return {
    debug(msg: string, context?: LogContext) {
      pinoInstance.debug(context ? (sanitize(context) as object) : {}, msg);
    },
    info(msg: string, context?: LogContext) {
      pinoInstance.info(context ? (sanitize(context) as object) : {}, msg);
    },
    warn(msg: string, context?: LogContext) {
      pinoInstance.warn(context ? (sanitize(context) as object) : {}, msg);
    },
    error(msg: string, err?: unknown, context?: LogContext) {
      const errorDetails =
        err instanceof Error
          ? { message: err.message, stack: err.stack, name: err.name }
          : err ? { error: String(err) } : {};
      pinoInstance.error({ ...errorDetails, ...(context ? (sanitize(context) as object) : {}) }, msg);
    },
    child(context: LogContext): LoggerInstance {
      const childPino = pinoInstance.child(sanitize(context) as object);
      return createLoggerInstance(childPino);
    },
  };
}

export const logger: LoggerInstance = createLoggerInstance(baseLogger);
