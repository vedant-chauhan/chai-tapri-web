/**
 * Server environment, validated with Zod (ADR-0010).
 *
 * Values come from `process.env`: `.env.local` under `next dev`, `.dev.vars` under
 * `wrangler dev`, and Wrangler secrets/vars on Cloudflare (OpenNext copies bindings into
 * `process.env` per request). Names are listed in `.env.example` / `.dev.vars.example`.
 *
 * Read lazily with `getEnv()` at request time, never at module load, so `next build` works
 * without secrets. Validation errors name the variable but never echo its value.
 */
import "server-only";
import { z } from "zod";

const secret = (min: number) => z.string().min(min, `must be at least ${min} characters`);

export const envSchema = z.object({
  APP_ENV: z.enum(["local", "test", "preview", "staging", "production"]).default("local"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),

  /** Postgres connection string. Neon in deployed envs; local Postgres or Neon branch in dev. */
  DATABASE_URL: z
    .string()
    .regex(/^postgres(ql)?:\/\//, "must be a postgres:// connection string")
    .optional(),

  /** Better Auth signing/encryption secret. Generate with `openssl rand -base64 32`. */
  AUTH_SECRET: secret(32).optional(),
  /** Public origin of the app, e.g. https://chai-tapri-staging.<account>.workers.dev */
  AUTH_URL: z.url().optional(),

  /** Bearer token for POST /api/cron/sweep (the Cron Trigger sends it internally). */
  CRON_SECRET: secret(32).optional(),

  /** Google Places API (New) key: server-only, restricted to the Places API (ADR-0013). Optional. */
  GOOGLE_PLACES_API_KEY: z.string().min(20).optional(),
  /** The shop's Google Place ID (storable indefinitely under Google's terms). Optional. */
  GOOGLE_PLACE_ID: z
    .string()
    .regex(/^[A-Za-z0-9_-]{10,}$/, "must be a Google Place ID")
    .optional(),
});

/** Deployed environments must have every secret; local/test may run without (features degrade, health says 503). */
const REQUIRED_WHEN_DEPLOYED = ["DATABASE_URL", "AUTH_SECRET", "AUTH_URL", "CRON_SECRET"] as const;

const envSchemaChecked = envSchema.superRefine((env, ctx) => {
  if (env.APP_ENV === "local" || env.APP_ENV === "test") return;
  for (const key of REQUIRED_WHEN_DEPLOYED) {
    if (!env[key]) ctx.addIssue({ code: "custom", path: [key], message: `is required when APP_ENV=${env.APP_ENV}` });
  }
});

export type Env = z.infer<typeof envSchema>;

export class EnvError extends Error {
  constructor(readonly problems: string[]) {
    super(`Invalid environment: ${problems.join("; ")}`);
    this.name = "EnvError";
  }
}

export function parseEnv(source: Record<string, string | undefined>): Env {
  // Treat empty strings as unset (common with copied example files).
  const cleaned = Object.fromEntries(Object.entries(source).filter(([, v]) => v !== undefined && v !== ""));
  const result = envSchemaChecked.safeParse(cleaned);
  if (!result.success) {
    throw new EnvError(result.error.issues.map((i) => `${i.path.join(".") || "(root)"} ${i.message}`));
  }
  return result.data;
}

let cached: Env | undefined;

export function getEnv(): Env {
  cached ??= parseEnv(process.env);
  return cached;
}

/** Returns a required variable or throws a clear error (without the value). */
export function requireEnv<K extends keyof Env>(key: K): NonNullable<Env[K]> {
  const value = getEnv()[key];
  if (value === undefined || value === null) {
    throw new EnvError([`${String(key)} is required here but not set`]);
  }
  return value as NonNullable<Env[K]>;
}

/** For tests only. */
export function resetEnvCache(): void {
  cached = undefined;
}
