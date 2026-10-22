/**
 * Injectable clock. Business logic never calls `new Date()` or `Date.now()`
 * directly; it takes a `Clock` so tests can pin time (BR-AV-1, TESTING.md).
 *
 * Time-zone maths uses Intl (tz-aware). Never hard-code +8.
 */

export const STORE_TIME_ZONE = "Australia/Perth";

/** Local time at which one trading day ends and the next begins (DATABASE.md §6 `store_settings`). */
export const DEFAULT_TRADING_DAY_BOUNDARY = "05:00";

export interface Clock {
  now(): Date;
}

export const systemClock: Clock = {
  now: () => new Date(),
};

/** A clock that always returns the same instant. For tests. */
export function fixedClock(at: Date | string): Clock {
  const instant = new Date(at);
  if (Number.isNaN(instant.getTime())) {
    throw new RangeError(`Invalid instant: ${String(at)}`);
  }
  return { now: () => new Date(instant) };
}

export interface LocalParts {
  /** `YYYY-MM-DD` in the store's time zone. */
  date: string;
  /** `HH:MM` (24 h) in the store's time zone. */
  time: string;
  /** ISO weekday, 1 = Monday … 7 = Sunday. */
  weekday: number;
}

const partsFormatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = partsFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-AU", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      weekday: "short",
      hourCycle: "h23",
    });
    partsFormatters.set(timeZone, formatter);
  }
  return formatter;
}

const WEEKDAYS: Record<string, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
};

/** Wall-clock date, time and weekday of `instant` in `timeZone`. */
export function localParts(instant: Date, timeZone: string = STORE_TIME_ZONE): LocalParts {
  const parts = Object.fromEntries(
    formatterFor(timeZone)
      .formatToParts(instant)
      .map((p) => [p.type, p.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
    weekday: WEEKDAYS[parts.weekday],
  };
}

/** `YYYY-MM-DD` minus one calendar day. */
function previousDate(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * The trading day an instant belongs to (BR-AV-2). Before the boundary
 * (default 05:00 local) the instant still belongs to the previous day, so
 * 00:30 Saturday is part of Friday's trading day.
 */
export function tradingDate(
  instant: Date,
  boundary: string = DEFAULT_TRADING_DAY_BOUNDARY,
  timeZone: string = STORE_TIME_ZONE,
): string {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(boundary)) {
    throw new RangeError(`Invalid trading-day boundary: ${boundary}`);
  }
  const { date, time } = localParts(instant, timeZone);
  return time < boundary ? previousDate(date) : date;
}
