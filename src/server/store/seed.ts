/**
 * The slice-1 seed values, shared by the database seed (migration 0004 inserts the same hours,
 * pinned by tests/integration/store-hours.test.ts) and the local-dev preview fallback.
 */
import type { AvailabilitySettings, WeeklyWindow } from "@/domain/availability";

/** [Assumption — CLIENT_QUESTIONS Q15] Google Business Profile hours, 14 Oct 2026. Tuesday closed. */
export const SEED_WEEKLY_HOURS: WeeklyWindow[] = [
  { weekday: 1, opensAt: "11:00", closesAt: "22:00", closesNextDay: false },
  { weekday: 3, opensAt: "11:00", closesAt: "22:00", closesNextDay: false },
  { weekday: 4, opensAt: "11:00", closesAt: "22:00", closesNextDay: false },
  { weekday: 5, opensAt: "11:00", closesAt: "01:00", closesNextDay: true },
  { weekday: 6, opensAt: "11:00", closesAt: "01:00", closesNextDay: true },
  { weekday: 7, opensAt: "11:00", closesAt: "22:00", closesNextDay: false },
];

/** store_settings column defaults (migration 0000/0001). */
export const SEED_SETTINGS: AvailabilitySettings = {
  timezone: "Australia/Perth",
  tradingDayBoundary: "05:00",
  prepMinutes: 10,
  lastOrderOffsetMinutes: 30,
  onlineOrderingEnabled: true,
};
