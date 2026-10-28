/**
 * Where the schedule comes from for public endpoints.
 *
 * - DATABASE_URL set: the real data (always the case when deployed; env.ts requires it).
 * - Local `next dev` without a database: the seed hours, so pages can be previewed before a
 *   database exists. Never in a production build (`NODE_ENV=production`), so a deployed site can't
 *   silently show seed hours; responses carry `x-schedule-source: seed-preview` so it's visible.
 */
import "server-only";
import type { AvailabilityInput } from "@/domain/availability";
import { EnvError, getEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { withDb } from "@/server/db/client";
import { loadAvailabilityInput } from "./schedule-repository";
import { SEED_SETTINGS, SEED_WEEKLY_HOURS } from "./seed";

export type ScheduleSource = "database" | "seed-preview";

let warned = false;

export async function withScheduleInput<T>(
  now: Date,
  fn: (input: AvailabilityInput, source: ScheduleSource) => Promise<T>,
): Promise<T> {
  const url = getEnv().DATABASE_URL;
  if (url) return withDb(url, async (db) => fn(await loadAvailabilityInput(db, now), "database"));

  if (process.env.NODE_ENV === "development") {
    if (!warned) {
      logger.warn("DATABASE_URL not set: serving seed hours for local preview only");
      warned = true;
    }
    const input = { now, settings: SEED_SETTINGS, weeklyHours: SEED_WEEKLY_HOURS, dateExceptions: [], overrides: [] };
    return fn(input, "seed-preview");
  }
  throw new EnvError(["DATABASE_URL is required"]);
}
