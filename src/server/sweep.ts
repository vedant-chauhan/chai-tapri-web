/**
 * The minute sweep (API.md "Internal"). Runs from the Cron Trigger (worker.ts → POST
 * /api/cron/sweep) and from manual/local calls to the same route.
 *
 * Phase 4: no steps yet, only the heartbeat. Slice 1 adds, in order, each bounded and
 * idempotent: expire holds → time out unaccepted orders → auto-complete ready orders →
 * reset sold-out flags → run outbox jobs → reconcile Stripe → heartbeat.
 */
import { cronHeartbeats } from "./db/schema";
import type { Db } from "./db/types";
import type { Clock } from "@/domain/clock";
import type { Logger } from "@/lib/logger";

export const SWEEP_JOB = "sweep";

export interface SweepDeps {
  db: Db;
  clock: Clock;
  log: Logger;
}

export interface SweepResult {
  ok: boolean;
  startedAt: string;
  durationMs: number;
}

type SweepStep = (deps: SweepDeps) => Promise<void>;

/** Slice 1 fills this list. */
const STEPS: SweepStep[] = [];

async function writeHeartbeat(db: Db, at: Date, ok: boolean): Promise<void> {
  await db
    .insert(cronHeartbeats)
    .values({ name: SWEEP_JOB, lastRunAt: at, lastOk: ok })
    .onConflictDoUpdate({ target: cronHeartbeats.name, set: { lastRunAt: at, lastOk: ok, updatedAt: at } });
}

export async function runSweep(deps: SweepDeps): Promise<SweepResult> {
  const startedAt = deps.clock.now();
  try {
    for (const step of STEPS) await step(deps);
    await writeHeartbeat(deps.db, startedAt, true);
    const durationMs = deps.clock.now().getTime() - startedAt.getTime();
    deps.log.info("sweep ok", { job: SWEEP_JOB, durationMs });
    return { ok: true, startedAt: startedAt.toISOString(), durationMs };
  } catch (err) {
    deps.log.error("sweep failed", { job: SWEEP_JOB, err });
    // Best effort: record the failure so /api/health and the uptime monitor see it.
    await writeHeartbeat(deps.db, startedAt, false).catch(() => {});
    throw err;
  }
}
