/**
 * Availability engine: "can a customer order now, and until when?"
 * (BUSINESS_RULES §1, SLICE-01 §4.2). Pure: no I/O, no `Date.now()`. The caller passes the
 * instant and the schedule data, so every case is unit-testable with a fixed clock.
 *
 * Precedence (§1.2, highest wins): kill switch → active manual override → date exception
 * for the trading day → weekly schedule.
 *
 * The same function feeds the status chip, order placement and the board header, so
 * "open" can never disagree with "can order now" (BR-AV-12).
 */
import { addDays, tradingDate, weekdayOf, zonedInstant } from "./clock";

/** How far ahead `nextOpen` searches (SLICE-01 §4.2). */
export const NEXT_OPEN_SEARCH_DAYS = 14;

export interface WeeklyWindow {
  /** ISO weekday of the trading day, 1 = Monday. */
  weekday: number;
  /** Local wall-clock times, `HH:MM` or `HH:MM:SS`. */
  opensAt: string;
  closesAt: string;
  /** True when the window ends after midnight (e.g. Fri 11:00 → 01:00). */
  closesNextDay: boolean;
}

export interface DateException {
  /** Trading date `YYYY-MM-DD` (00:00–04:59 belongs to the previous day, BR-AV-2). */
  tradingDate: string;
  kind: "closed" | "special_hours";
  opensAt: string | null;
  closesAt: string | null;
  closesNextDay: boolean;
  publicNote: string | null;
}

export interface OrderingOverride {
  id: string;
  mode: "open" | "closed";
  scope: "all" | "delivery";
  startsAt: Date;
  /** Required for "open". Null "closed" = until reopened (see `effectiveOverrideEnd`). */
  endsAt: Date | null;
  clearedAt: Date | null;
}

export interface AvailabilitySettings {
  timezone: string;
  /** Local time the trading day rolls over, `HH:MM` (default 05:00). */
  tradingDayBoundary: string;
  prepMinutes: number;
  /** Online ordering stops this many minutes before the shop closes (F5 assumption: 30). */
  lastOrderOffsetMinutes: number;
  /** Owner kill switch. */
  onlineOrderingEnabled: boolean;
}

export interface AvailabilityInput {
  now: Date;
  settings: AvailabilitySettings;
  weeklyHours: WeeklyWindow[];
  dateExceptions: DateException[];
  overrides: OrderingOverride[];
}

export type ClosedReason = "outside_hours" | "paused" | "unavailable";

export interface StoreStatus {
  open: boolean;
  reason: ClosedReason | null;
  /** When online ordering stops (open only). */
  orderingUntil: Date | null;
  /** When it next opens (closed only; null if unknown, e.g. kill switch, or nothing in 14 days). */
  nextOpen: Date | null;
  /** Public note from today's date exception, e.g. "Closed for Diwali". */
  notice: string | null;
  prepMinutes: number;
  /** Which rule decided (for staff screens and logs). */
  source: "kill_switch" | "override" | "exception" | "schedule";
  /** The override in force, if any. */
  activeOverride: OrderingOverride | null;
}

interface Window {
  /** Shop opens. */
  opens: Date;
  /** Online ordering stops (shop close − last-order offset). */
  orderingEnds: Date;
}

const MINUTE = 60_000;

/** Shop windows of one trading day as instants, from the exception if there is one, else the weekly hours. */
function windowsFor(day: string, input: AvailabilityInput): { windows: Window[]; exception: DateException | null } {
  const { settings } = input;
  const exception = input.dateExceptions.find((e) => e.tradingDate === day) ?? null;
  const source: Array<Pick<WeeklyWindow, "opensAt" | "closesAt" | "closesNextDay">> = exception
    ? exception.kind === "special_hours" && exception.opensAt && exception.closesAt
      ? [{ opensAt: exception.opensAt, closesAt: exception.closesAt, closesNextDay: exception.closesNextDay }]
      : []
    : input.weeklyHours.filter((w) => w.weekday === weekdayOf(day));

  const windows = source
    .map((w) => {
      const opens = zonedInstant(day, w.opensAt, settings.timezone);
      const closes = zonedInstant(w.closesNextDay ? addDays(day, 1) : day, w.closesAt, settings.timezone);
      return { opens, orderingEnds: new Date(closes.getTime() - settings.lastOrderOffsetMinutes * MINUTE) };
    })
    .filter((w) => w.orderingEnds > w.opens)
    .sort((a, b) => a.opens.getTime() - b.opens.getTime());

  return { windows, exception };
}

/**
 * When an override stops applying. "Close now" without an end time lasts until the end of the
 * trading day it was made in, so the next day opens automatically
 * [Assumption, BUSINESS_RULES §1.4 "Close now, until reopened": confirm with owner].
 */
export function effectiveOverrideEnd(
  o: OrderingOverride,
  settings: Pick<AvailabilitySettings, "timezone" | "tradingDayBoundary">,
): Date {
  if (o.endsAt) return o.endsAt;
  const day = tradingDate(o.startsAt, settings.tradingDayBoundary, settings.timezone);
  return zonedInstant(addDays(day, 1), settings.tradingDayBoundary, settings.timezone);
}

/** The override in force at `now`: not cleared, started, not ended. The most recent one wins (§1.2). */
export function activeOverride(input: AvailabilityInput): OrderingOverride | null {
  const { now, settings } = input;
  return (
    input.overrides
      .filter((o) => o.scope === "all" && !o.clearedAt && o.startsAt <= now && now < effectiveOverrideEnd(o, settings))
      .sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime())[0] ?? null
  );
}

/**
 * First instant ≥ `from` at which ordering can open on the schedule (window start, or `from`
 * itself if it falls inside a window with time left to prepare an order).
 */
function nextOpenFrom(from: Date, input: AvailabilityInput): Date | null {
  const { settings } = input;
  const prepMs = settings.prepMinutes * MINUTE;
  const firstDay = tradingDate(from, settings.tradingDayBoundary, settings.timezone);
  for (let i = 0; i <= NEXT_OPEN_SEARCH_DAYS; i++) {
    for (const w of windowsFor(addDays(firstDay, i), input).windows) {
      const start = w.opens > from ? w.opens : from;
      if (w.orderingEnds.getTime() - start.getTime() >= prepMs) return start;
    }
  }
  return null;
}

export function computeStoreStatus(input: AvailabilityInput): StoreStatus {
  const { now, settings } = input;
  const prepMs = settings.prepMinutes * MINUTE;
  const today = tradingDate(now, settings.tradingDayBoundary, settings.timezone);
  const { windows, exception } = windowsFor(today, input);
  const base = { prepMinutes: settings.prepMinutes, notice: exception?.publicNote ?? null };

  // 1. Kill switch.
  if (!settings.onlineOrderingEnabled) {
    return {
      ...base,
      open: false,
      reason: "unavailable",
      orderingUntil: null,
      nextOpen: null,
      source: "kill_switch",
      activeOverride: null,
    };
  }

  // 2. Manual override.
  const override = activeOverride(input);
  if (override) {
    const end = effectiveOverrideEnd(override, settings);
    if (override.mode === "closed") {
      return {
        ...base,
        open: false,
        reason: "paused",
        orderingUntil: null,
        nextOpen: nextOpenFrom(end, input),
        source: "override",
        activeOverride: override,
      };
    }
    // "Open now until …": works outside scheduled hours (§1.2). Needs time to prepare an order.
    if (end.getTime() - now.getTime() >= prepMs) {
      return {
        ...base,
        open: true,
        reason: null,
        orderingUntil: end,
        nextOpen: null,
        source: "override",
        activeOverride: override,
      };
    }
    return {
      ...base,
      open: false,
      reason: "outside_hours",
      orderingUntil: null,
      nextOpen: nextOpenFrom(end, input),
      source: "override",
      activeOverride: override,
    };
  }

  // 3–4. Date exception or weekly schedule. ASAP needs now + prep ≤ cut-off (BR-AV-3).
  const source = exception ? "exception" : "schedule";
  const current = windows.find((w) => w.opens <= now && now < w.orderingEnds);
  if (current && current.orderingEnds.getTime() - now.getTime() >= prepMs) {
    return {
      ...base,
      open: true,
      reason: null,
      orderingUntil: current.orderingEnds,
      nextOpen: null,
      source,
      activeOverride: null,
    };
  }

  // Closed: search from just after now so a window that's too close to its cut-off is skipped.
  return {
    ...base,
    open: false,
    reason: "outside_hours",
    orderingUntil: null,
    nextOpen: nextOpenFrom(current ? current.orderingEnds : now, input),
    source,
    activeOverride: null,
  };
}

/** Convenience for order placement (SLICE-01 §4.2 `canOrderNow`). */
export function canOrderNow(input: AvailabilityInput): boolean {
  return computeStoreStatus(input).open;
}
