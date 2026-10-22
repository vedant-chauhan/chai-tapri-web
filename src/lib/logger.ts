/**
 * Structured JSON logger with redaction (SECURITY.md "Logging").
 *
 * Logs may carry request ids, order ids, status transitions and error codes.
 * They must never carry card data, client secrets, full tokens, names, emails
 * or phone numbers. Redaction runs on every field before anything is written:
 * sensitive keys are replaced wholesale, and string values are scrubbed for
 * email/phone/bearer/Stripe-secret patterns in case PII slips into a message.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogFields = Record<string, unknown>;

export const REDACTED = "[redacted]";

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

/** Keys whose values are always removed, whatever they contain (case-insensitive, `_`/`-` ignored). */
const SENSITIVE_KEYS = new Set(
  [
    "authorization",
    "cookie",
    "setcookie",
    "password",
    "passwordhash",
    "secret",
    "clientsecret",
    "token",
    "accesstoken",
    "refreshtoken",
    "idtoken",
    "sessiontoken",
    "apikey",
    "totp",
    "otp",
    "totpcode",
    "backupcodes",
    "email",
    "phone",
    "phonee164",
    "mobile",
    "name",
    "firstname",
    "lastname",
    "fullname",
    "customername",
    "address",
    "notes",
    "card",
    "cardnumber",
    "cvc",
    "databaseurl",
  ].map(normaliseKey),
);

function normaliseKey(key: string): string {
  return key.toLowerCase().replace(/[_-]/g, "");
}

function isSensitiveKey(key: string): boolean {
  const k = normaliseKey(key);
  return SENSITIVE_KEYS.has(k) || k.endsWith("secret") || k.endsWith("token") || k.endsWith("password");
}

const VALUE_PATTERNS: Array<[RegExp, string]> = [
  // Emails
  [/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]"],
  // Bearer / Basic credentials
  [/\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/g, "$1 [redacted]"],
  // Stripe secrets, restricted keys, webhook secrets, client secrets
  [/\b(sk|rk)_(live|test)_[A-Za-z0-9]+/g, "[stripe-key]"],
  [/\bwhsec_[A-Za-z0-9]+/g, "[stripe-key]"],
  [/\bpi_[A-Za-z0-9]+_secret_[A-Za-z0-9]+/g, "[client-secret]"],
  // Postgres connection strings (contain passwords)
  [/postgres(ql)?:\/\/[^\s"']+/gi, "[database-url]"],
  // Phone numbers: international (+61 412 345 678), AU mobile (0412 345 678), AU landline ((08) 9123 4567).
  // Kept narrow so dates (2026-10-16) and UUIDs survive.
  [/\+\d{1,3}[\s-]?(?:\(?\d{1,4}\)?[\s-]?){2,4}\d{2,4}\b/g, "[phone]"],
  [/\b04\d{2}[\s-]?\d{3}[\s-]?\d{3}\b/g, "[phone]"],
  [/(?:\(0[2378]\)|\b0[2378])[\s-]?\d{4}[\s-]?\d{4}\b/g, "[phone]"],
];

export function scrubString(value: string): string {
  let out = value;
  for (const [pattern, replacement] of VALUE_PATTERNS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

const MAX_DEPTH = 6;

/** Returns a deep copy of `value` with sensitive keys and patterns removed. */
export function redact(value: unknown, depth = 0, seen = new WeakSet<object>()): unknown {
  if (typeof value === "string") return scrubString(value);
  if (value === null || typeof value !== "object") {
    return typeof value === "bigint" ? value.toString() : value;
  }
  if (seen.has(value)) return "[circular]";
  if (depth >= MAX_DEPTH) return "[truncated]";
  seen.add(value);

  if (value instanceof Date) return value.toISOString();
  if (value instanceof Error) {
    return {
      type: value.name,
      message: scrubString(value.message),
      ...(value.stack ? { stack: scrubString(value.stack) } : {}),
      ...(value.cause !== undefined ? { cause: redact(value.cause, depth + 1, seen) } : {}),
    };
  }
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1, seen));

  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value)) {
    out[key] = isSensitiveKey(key) ? REDACTED : redact(v, depth + 1, seen);
  }
  return out;
}

export interface Logger {
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
  /** A logger whose entries always include `fields` (e.g. `{ requestId }`). */
  child(fields: LogFields): Logger;
}

export type LogSink = (level: LogLevel, line: string) => void;

const consoleSink: LogSink = (level, line) => {
  // Workers Logs and `next dev` both capture console output; one JSON object per line.
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
};

export interface LoggerOptions {
  level?: LogLevel;
  sink?: LogSink;
  base?: LogFields;
  now?: () => Date;
}

export function createLogger(options: LoggerOptions = {}): Logger {
  const { level = "info", sink = consoleSink, base = {}, now = () => new Date() } = options;
  const threshold = LEVEL_ORDER[level];

  const write = (lvl: LogLevel, message: string, fields?: LogFields) => {
    if (LEVEL_ORDER[lvl] < threshold) return;
    const entry = redact({ ...base, ...fields }) as LogFields;
    sink(lvl, JSON.stringify({ level: lvl, time: now().toISOString(), msg: scrubString(message), ...entry }));
  };

  return {
    debug: (m, f) => write("debug", m, f),
    info: (m, f) => write("info", m, f),
    warn: (m, f) => write("warn", m, f),
    error: (m, f) => write("error", m, f),
    child: (fields) => createLogger({ level, sink, now, base: { ...base, ...fields } }),
  };
}

function levelFromEnv(): LogLevel {
  const raw = typeof process !== "undefined" ? process.env.LOG_LEVEL : undefined;
  return raw === "debug" || raw === "info" || raw === "warn" || raw === "error" ? raw : "info";
}

export const logger: Logger = createLogger({ level: levelFromEnv() });
