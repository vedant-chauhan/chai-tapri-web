/** Loads everything the availability engine needs, in four small queries. */
import { and, asc, between, eq, gt, isNull, lte } from "drizzle-orm";
import { addDays, tradingDate } from "@/domain/clock";
import type { AvailabilityInput, AvailabilitySettings, OrderingOverride } from "@/domain/availability";
import { NEXT_OPEN_SEARCH_DAYS } from "@/domain/availability";
import { dateExceptions, orderingOverrides, storeSettings, weeklyHours } from "@/server/db/schema";
import type { Db } from "@/server/db/types";

/** "05:00:00" → "05:00" */
const hhmm = (t: string) => t.slice(0, 5);

export async function loadSettings(db: Db): Promise<AvailabilitySettings> {
  const [row] = await db.select().from(storeSettings).where(eq(storeSettings.id, 1));
  if (!row) throw new Error("store_settings row is missing (migration 0001 not applied?)");
  return {
    timezone: row.timezone,
    tradingDayBoundary: hhmm(row.tradingDayBoundary),
    prepMinutes: row.prepMinutesDefault,
    lastOrderOffsetMinutes: row.lastOrderOffsetMinutes,
    onlineOrderingEnabled: row.onlineOrderingEnabled,
  };
}

/** Overrides that may be in force at `now` (the engine decides which one actually is). */
export async function loadCandidateOverrides(db: Db, now: Date): Promise<OrderingOverride[]> {
  // A "close until reopened" lasts at most to the end of its trading day, so 2 days back is plenty.
  const since = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const rows = await db
    .select()
    .from(orderingOverrides)
    .where(
      and(
        isNull(orderingOverrides.clearedAt),
        lte(orderingOverrides.startsAt, now),
        gt(orderingOverrides.startsAt, since),
      ),
    )
    .orderBy(asc(orderingOverrides.startsAt));
  return rows.map((r) => ({
    id: r.id,
    mode: r.mode,
    scope: r.scope,
    startsAt: r.startsAt,
    endsAt: r.endsAt,
    clearedAt: r.clearedAt,
  }));
}

export async function loadAvailabilityInput(db: Db, now: Date): Promise<AvailabilityInput> {
  const settings = await loadSettings(db);
  const today = tradingDate(now, settings.tradingDayBoundary, settings.timezone);
  const [hours, exceptions, overrides] = await Promise.all([
    db.select().from(weeklyHours),
    db
      .select()
      .from(dateExceptions)
      .where(between(dateExceptions.tradingDate, addDays(today, -1), addDays(today, NEXT_OPEN_SEARCH_DAYS + 1))),
    loadCandidateOverrides(db, now),
  ]);
  return {
    now,
    settings,
    weeklyHours: hours.map((h) => ({
      weekday: h.weekday,
      opensAt: hhmm(h.opensAt),
      closesAt: hhmm(h.closesAt),
      closesNextDay: h.closesNextDay,
    })),
    dateExceptions: exceptions.map((e) => ({
      tradingDate: e.tradingDate,
      kind: e.kind,
      opensAt: e.opensAt ? hhmm(e.opensAt) : null,
      closesAt: e.closesAt ? hhmm(e.closesAt) : null,
      closesNextDay: e.closesNextDay,
      publicNote: e.publicNote,
    })),
    overrides,
  };
}
