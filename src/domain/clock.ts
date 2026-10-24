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

/** `YYYY-MM-DD` plus `days` calendar days (negative allowed). */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** ISO weekday (1 = Monday … 7 = Sunday) of a `YYYY-MM-DD` calendar date. */
export function weekdayOf(date: string): number {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

/** Offset of `timeZone` from UTC at `instant`, in milliseconds. */
function zoneOffsetMs(instant: Date, timeZone: string): number {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const p = Object.fromEntries(f.formatToParts(instant).map((x) => [x.type, x.value]));
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/**
 * The instant at which the wall clock in `timeZone` reads `date` + `time`.
 * `time` is `HH:MM` or `HH:MM:SS` (Postgres `time` columns return the latter).
 */
export function zonedInstant(date: string, time: string, timeZone: string = STORE_TIME_ZONE): Date {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi, s = 0] = time.split(":").map(Number);
  const wall = Date.UTC(y, mo - 1, d, h, mi, s);
  // Two passes handle zones whose offset changes around the target (Perth has none, but stay correct).
  let instant = wall - zoneOffsetMs(new Date(wall), timeZone);
  instant = wall - zoneOffsetMs(new Date(instant), timeZone);
  return new Date(instant);
}

/** "11am", "9:30pm", "12:15am" in the store's time zone (SITEMAP status chip copy). */
export function timeLabel(instant: Date, timeZone: string = STORE_TIME_ZONE): string {
  const [hh, mm] = localParts(instant, timeZone).time.split(":").map(Number);
  const suffix = hh < 12 ? "am" : "pm";
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return mm === 0 ? `${h12}${suffix}` : `${h12}:${String(mm).padStart(2, "0")}${suffix}`;
}

const WEEKDAY_NAMES = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * When the store next opens, relative to `now`: "5pm today" or "Wed 11am".
 * Uses the calendar date (what a customer reads on their phone), not the trading day.
 */
export function nextOpenLabel(next: Date, now: Date, timeZone: string = STORE_TIME_ZONE): string {
  const n = localParts(next, timeZone);
  if (n.date === localParts(now, timeZone).date) return `${timeLabel(next, timeZone)} today`;
  return `${WEEKDAY_NAMES[n.weekday]} ${timeLabel(next, timeZone)}`;
}
