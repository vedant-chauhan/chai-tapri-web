/**
 * Opening hours for the Visit page, footer and Home (SITEMAP: "hours table, same data source as
 * ordering"). Shop hours as customers read them, not the online-ordering cut-off.
 */
import type { AvailabilityInput } from "@/domain/availability";
import { addDays, dateLabel, tradingDate, wallTimeLabel, WEEKDAY_SHORT } from "@/domain/clock";

export interface HoursWindowDto {
  opens: string;
  closes: string;
  /** Closes after midnight (shown as "11am–1am"). */
  closesNextDay: boolean;
}

export interface HoursDto {
  /** Monday first. */
  week: Array<{ weekday: number; day: string; windows: HoursWindowDto[] }>;
  /** Today's trading day (ISO weekday), to highlight the row. */
  todayWeekday: number;
  /** Closures and special hours in the next 14 days. */
  upcoming: Array<{
    date: string;
    dateLabel: string;
    kind: "closed" | "special_hours";
    windows: HoursWindowDto[];
    note: string | null;
  }>;
}

export const UPCOMING_DAYS = 14;

export function toHoursDto(input: AvailabilityInput): HoursDto {
  const { settings } = input;
  const today = tradingDate(input.now, settings.tradingDayBoundary, settings.timezone);
  const last = addDays(today, UPCOMING_DAYS);
  const window = (opensAt: string, closesAt: string, closesNextDay: boolean): HoursWindowDto => ({
    opens: wallTimeLabel(opensAt),
    closes: wallTimeLabel(closesAt),
    closesNextDay,
  });

  return {
    week: [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({
      weekday,
      day: WEEKDAY_SHORT[weekday],
      windows: input.weeklyHours
        .filter((w) => w.weekday === weekday)
        .sort((a, b) => a.opensAt.localeCompare(b.opensAt))
        .map((w) => window(w.opensAt, w.closesAt, w.closesNextDay)),
    })),
    todayWeekday: new Date(`${today}T00:00:00Z`).getUTCDay() || 7,
    upcoming: input.dateExceptions
      .filter((e) => e.tradingDate >= today && e.tradingDate <= last)
      .sort((a, b) => a.tradingDate.localeCompare(b.tradingDate))
      .map((e) => ({
        date: e.tradingDate,
        dateLabel: dateLabel(e.tradingDate),
        kind: e.kind,
        windows: e.opensAt && e.closesAt ? [window(e.opensAt, e.closesAt, e.closesNextDay)] : [],
        note: e.publicNote,
      })),
  };
}
