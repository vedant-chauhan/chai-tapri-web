/**
 * GET /api/health (API.md "Internal"): for the uptime monitor.
 *   200 { db: "ok", stripe, sweepLagSeconds }
 *   503 when the DB is unreachable, or the sweep has never run / lags more than 5 minutes.
 * No secrets or PII in the body.
 */
import { sql, eq } from "drizzle-orm";
import { cronHeartbeats } from "./db/schema";
import type { Db } from "./db/types";
import { SWEEP_JOB } from "./sweep";
import type { Clock } from "@/domain/clock";
import type { Logger } from "@/lib/logger";

export const MAX_SWEEP_LAG_SECONDS = 5 * 60;
const DB_CHECK_TIMEOUT_MS = 3_000;

export interface HealthBody {
  db: "ok" | "error";
  /** Stripe is wired up in F4-10; until then it is reported but never fails the check. */
  stripe: "ok" | "error" | "not_configured";
  sweepLagSeconds: number | null;
  sweepLastOk: boolean | null;
}

export interface HealthResult {
  status: 200 | 503;
  body: HealthBody;
}

export interface HealthDeps {
  /** null when DATABASE_URL isn't configured. */
  db: Db | null;
  clock: Clock;
  log: Logger;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timed out after ${ms} ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export async function checkHealth({ db, clock, log }: HealthDeps): Promise<HealthResult> {
  const body: HealthBody = { db: "error", stripe: "not_configured", sweepLagSeconds: null, sweepLastOk: null };

  if (!db) {
    log.warn("health: DATABASE_URL not configured");
    return { status: 503, body };
  }

  try {
    const rows = await withTimeout(
      (async () => {
        await db.execute(sql`select 1`);
        return db
          .select({ lastRunAt: cronHeartbeats.lastRunAt, lastOk: cronHeartbeats.lastOk })
          .from(cronHeartbeats)
          .where(eq(cronHeartbeats.name, SWEEP_JOB));
      })(),
      DB_CHECK_TIMEOUT_MS,
    );
    body.db = "ok";
    if (rows[0]) {
      body.sweepLagSeconds = Math.max(0, Math.round((clock.now().getTime() - rows[0].lastRunAt.getTime()) / 1000));
      body.sweepLastOk = rows[0].lastOk;
    }
  } catch (err) {
    log.error("health: database check failed", { err });
    return { status: 503, body };
  }

  const sweepHealthy = body.sweepLagSeconds !== null && body.sweepLagSeconds <= MAX_SWEEP_LAG_SECONDS;
  return { status: sweepHealthy ? 200 : 503, body };
}
