type LogLevel = "info" | "warn" | "error" | "debug";

type LogPayload = Record<string, unknown>;

function log(level: LogLevel, event: string, payload: LogPayload = {}): void {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    service: "erizon",
    ...payload,
  };

  const line = JSON.stringify(entry);

  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export function logEvent(event: string, payload?: LogPayload): void {
  log("info", event, payload);
}

export function logWarn(event: string, payload?: LogPayload): void {
  log("warn", event, payload);
}

export function logError(event: string, error: unknown, payload?: LogPayload): void {
  const errorDetails =
    error instanceof Error
      ? { errorMessage: error.message, errorStack: error.stack }
      : { errorRaw: String(error) };
  log("error", event, { ...errorDetails, ...payload });
}

export function logDebug(event: string, payload?: LogPayload): void {
  if (process.env.LOG_LEVEL === "debug") {
    log("debug", event, payload);
  }
}

export const logger = {
  info: (event: string, payload?: LogPayload) => log("info", event, payload),
  warn: (event: string, payload?: LogPayload) => log("warn", event, payload),
  error: (event: string, payload?: LogPayload) => log("error", event, payload),
  debug: (event: string, payload?: LogPayload) => {
    if (process.env.LOG_LEVEL === "debug") log("debug", event, payload);
  },
};
