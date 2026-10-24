/**
 * Owner/staff ordering controls (API.md staff table, BUSINESS_RULES §1.2/§1.3):
 *
 * - Close now:  staff+ (`ordering.close`). Staff must give an end time ≤ 2 h away; managers and
 *               owners may close "until reopened" (which lasts to the end of the trading day).
 * - Open now:   owner (`ordering.open`). End time required (F10), ≤ the next trading-day boundary.
 * - Clear:      owner clears any override; others only a close they made themselves.
 *
 * A new override replaces the active one (both kept for history). Every change is audited.
 */
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { activeOverride, effectiveOverrideEnd, type AvailabilitySettings } from "@/domain/availability";
import { addDays, tradingDate, zonedInstant, type Clock } from "@/domain/clock";
import { ApiError } from "@/lib/errors";
import { can } from "@/server/auth/capabilities";
import { auditLog, orderingOverrides, type StaffRole } from "@/server/db/schema";
import type { Db } from "@/server/db/types";
import { loadAvailabilityInput, loadCandidateOverrides, loadSettings } from "./schedule-repository";

export const STAFF_MAX_CLOSE_MINUTES = 120;
const MINUTE = 60_000;

export interface Actor {
  userId: string;
  role: StaffRole;
}

interface Deps {
  db: Db;
  clock: Clock;
  actor: Actor;
}

const isoInstant = z.iso.datetime({ offset: true });
const reason = z.string().trim().max(200).optional();

export const closeBodySchema = z.strictObject({ until: isoInstant.nullable(), reason });
export const openBodySchema = z.strictObject({ until: isoInstant.optional(), reason });

/** End of the trading day containing `now` (the next 05:00 local). */
function nextBoundary(now: Date, settings: AvailabilitySettings): Date {
  const day = tradingDate(now, settings.tradingDayBoundary, settings.timezone);
  return zonedInstant(addDays(day, 1), settings.tradingDayBoundary, settings.timezone);
}

function invalidUntil(message: string): ApiError {
  return new ApiError("validation_failed", { details: [{ field: "until", code: "invalid_until", message }] });
}

/** Ids of overrides currently in force (the engine's view, so "until reopened" expiry is respected). */
async function activeOverrideIds(db: Db, now: Date, settings: AvailabilitySettings): Promise<string[]> {
  const candidates = await loadCandidateOverrides(db, now);
  return candidates.filter((o) => o.scope === "all" && now < effectiveOverrideEnd(o, settings)).map((o) => o.id);
}

async function replaceOverride(
  { db, clock, actor }: Deps,
  values: { mode: "open" | "closed"; endsAt: Date | null; reason?: string },
  action: string,
) {
  const now = clock.now();
  const settings = await loadSettings(db);
  await db.transaction(async (tx) => {
    const replaced = await activeOverrideIds(tx as unknown as Db, now, settings);
    if (replaced.length) {
      await tx
        .update(orderingOverrides)
        .set({ clearedAt: now, clearedBy: actor.userId })
        .where(inArray(orderingOverrides.id, replaced));
    }
    const [created] = await tx
      .insert(orderingOverrides)
      .values({
        mode: values.mode,
        scope: "all",
        startsAt: now,
        endsAt: values.endsAt,
        reason: values.reason || null,
        createdBy: actor.userId,
      })
      .returning({ id: orderingOverrides.id });
    await tx.insert(auditLog).values({
      actorId: actor.userId,
      action,
      entity: "ordering_override",
      entityId: created.id,
      before: { replaced },
      after: { mode: values.mode, endsAt: values.endsAt?.toISOString() ?? null, reason: values.reason ?? null },
    });
  });
}

export async function closeOrdering(deps: Deps, body: z.infer<typeof closeBodySchema>): Promise<void> {
  const { db, clock, actor } = deps;
  if (!can(actor.role, "ordering.close")) throw new ApiError("forbidden");
  const now = clock.now();
  const settings = await loadSettings(db);
  const until = body.until ? new Date(body.until) : null;

  if (actor.role === "staff") {
    if (!until) throw invalidUntil("Staff can close online ordering for up to 2 hours. Choose an end time.");
    if (until.getTime() - now.getTime() > STAFF_MAX_CLOSE_MINUTES * MINUTE) {
      throw invalidUntil("Staff can close online ordering for up to 2 hours.");
    }
  }
  if (until && until <= now) throw invalidUntil("The end time must be in the future.");
  if (until && until > nextBoundary(now, settings)) {
    throw invalidUntil("Use a date exception to close beyond today's trading day.");
  }
  await replaceOverride(deps, { mode: "closed", endsAt: until, reason: body.reason }, "ordering.close");
}

export async function openOrdering(deps: Deps, body: z.infer<typeof openBodySchema>): Promise<void> {
  const { db, clock, actor } = deps;
  if (!can(actor.role, "ordering.open")) throw new ApiError("forbidden");
  if (!body.until) throw new ApiError("until_required");
  const now = clock.now();
  const settings = await loadSettings(db);
  const until = new Date(body.until);
  if (until.getTime() - now.getTime() < settings.prepMinutes * MINUTE) {
    throw invalidUntil(`Keep ordering open for at least ${settings.prepMinutes} minutes (the prep time).`);
  }
  if (until > nextBoundary(now, settings)) {
    throw invalidUntil("'Open now' can only run until the end of today's trading day.");
  }
  await replaceOverride(deps, { mode: "open", endsAt: until, reason: body.reason }, "ordering.open");
}

export async function clearOverride({ db, clock, actor }: Deps): Promise<void> {
  if (!can(actor.role, "ordering.close")) throw new ApiError("forbidden");
  const now = clock.now();
  const input = await loadAvailabilityInput(db, now);
  const current = activeOverride(input);
  if (!current) return; // already on schedule: idempotent

  const [row] = await db
    .select({ createdBy: orderingOverrides.createdBy })
    .from(orderingOverrides)
    .where(eq(orderingOverrides.id, current.id));
  const ownClose = current.mode === "closed" && row?.createdBy === actor.userId;
  if (actor.role !== "owner" && !ownClose) throw new ApiError("forbidden");

  const ids = await activeOverrideIds(db, now, input.settings);
  await db.transaction(async (tx) => {
    await tx
      .update(orderingOverrides)
      .set({ clearedAt: now, clearedBy: actor.userId })
      .where(inArray(orderingOverrides.id, ids));
    await tx.insert(auditLog).values({
      actorId: actor.userId,
      action: "ordering.override_clear",
      entity: "ordering_override",
      entityId: current.id,
      before: { cleared: ids },
      after: null,
    });
  });
}
