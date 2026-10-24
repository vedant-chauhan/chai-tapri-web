import { describe, expect, it } from "vitest";
import {
  computeStoreStatus,
  type AvailabilityInput,
  type DateException,
  type OrderingOverride,
  type WeeklyWindow,
} from "@/domain/availability";

/**
 * Hours used throughout = the slice-1 seed (SLICE-01 §2, [Assumption Q15]):
 * Mon/Wed/Thu/Sun 11:00–22:00, Fri/Sat 11:00–01:00, Tue closed. Cut-off 30 min, prep 10 min.
 * Reference week (Perth): Thu 15 Oct 2026 … Wed 21 Oct 2026. Perth = UTC+8, so local 23:50 = 15:50Z.
 */
const SEED_HOURS: WeeklyWindow[] = [
  ...[1, 3, 4, 7].map((weekday) => ({ weekday, opensAt: "11:00", closesAt: "22:00", closesNextDay: false })),
  ...[5, 6].map((weekday) => ({ weekday, opensAt: "11:00", closesAt: "01:00", closesNextDay: true })),
];

/** Perth wall clock → instant. Perth has no DST, so -8 h is exact for tests. */
const perth = (local: string) => new Date(`${local}:00+08:00`);

function input(now: string, overrides: Partial<AvailabilityInput> = {}): AvailabilityInput {
  return {
    now: perth(now),
    settings: {
      timezone: "Australia/Perth",
      tradingDayBoundary: "05:00",
      prepMinutes: 10,
      lastOrderOffsetMinutes: 30,
      onlineOrderingEnabled: true,
    },
    weeklyHours: SEED_HOURS,
    dateExceptions: [],
    overrides: [],
    ...overrides,
  };
}

const override = (o: Partial<OrderingOverride> & Pick<OrderingOverride, "mode" | "startsAt">): OrderingOverride => ({
  id: "o1",
  scope: "all",
  endsAt: null,
  clearedAt: null,
  ...o,
});

describe("BUSINESS_RULES §1.4 edge cases", () => {
  it("Fri 23:50 → open, orders until 00:30 (ready 00:00 ≤ 00:30)", () => {
    const s = computeStoreStatus(input("2026-10-16T23:50"));
    expect(s).toMatchObject({ open: true, reason: null, source: "schedule" });
    expect(s.orderingUntil).toEqual(perth("2026-10-17T00:30"));
  });

  it("Sat 00:25 (Friday's trading day) → closed: 00:35 would be past the 00:30 cut-off", () => {
    const s = computeStoreStatus(input("2026-10-17T00:25"));
    expect(s).toMatchObject({ open: false, reason: "outside_hours" });
    expect(s.nextOpen).toEqual(perth("2026-10-17T11:00"));
  });

  it("Sat 00:40 → closed, opens Sat 11:00", () => {
    const s = computeStoreStatus(input("2026-10-17T00:40"));
    expect(s).toMatchObject({ open: false, reason: "outside_hours" });
    expect(s.nextOpen).toEqual(perth("2026-10-17T11:00"));
  });

  it("Tuesday → closed, opens Wed 11:00 (no ordering ahead)", () => {
    const s = computeStoreStatus(input("2026-10-20T14:00"));
    expect(s).toMatchObject({ open: false, reason: "outside_hours" });
    expect(s.nextOpen).toEqual(perth("2026-10-21T11:00"));
  });

  it("Owner 'Open now until 16:00' on Tuesday → open until 16:00, then closed automatically", () => {
    const open = override({ mode: "open", startsAt: perth("2026-10-20T13:55"), endsAt: perth("2026-10-20T16:00") });
    const during = computeStoreStatus(input("2026-10-20T14:00", { overrides: [open] }));
    expect(during).toMatchObject({ open: true, source: "override" });
    expect(during.orderingUntil).toEqual(perth("2026-10-20T16:00"));

    const after = computeStoreStatus(input("2026-10-20T16:00", { overrides: [open] }));
    expect(after).toMatchObject({ open: false, reason: "outside_hours", source: "schedule" });
    expect(after.nextOpen).toEqual(perth("2026-10-21T11:00"));
  });

  it("Thu 21:40, owner keeps it open until 23:00 past the 21:30 cut-off → open until 23:00", () => {
    expect(computeStoreStatus(input("2026-10-15T21:40")).open).toBe(false);
    const keep = override({ mode: "open", startsAt: perth("2026-10-15T21:35"), endsAt: perth("2026-10-15T23:00") });
    const s = computeStoreStatus(input("2026-10-15T21:40", { overrides: [keep] }));
    expect(s).toMatchObject({ open: true, source: "override" });
    expect(s.orderingUntil).toEqual(perth("2026-10-15T23:00"));
  });

  it("'Close now, until reopened' at Thu 20:00 → paused; Friday opens automatically at 11:00 [Assumption]", () => {
    const close = override({ mode: "closed", startsAt: perth("2026-10-15T20:00") });
    const evening = computeStoreStatus(input("2026-10-15T20:30", { overrides: [close] }));
    expect(evening).toMatchObject({ open: false, reason: "paused", source: "override" });
    expect(evening.nextOpen).toEqual(perth("2026-10-16T11:00"));

    const friday = computeStoreStatus(input("2026-10-16T11:05", { overrides: [close] }));
    expect(friday).toMatchObject({ open: true, source: "schedule" });
  });
});

describe("manual overrides", () => {
  it("'Close now for 30 min' → paused until then, reopens on schedule", () => {
    const close = override({ mode: "closed", startsAt: perth("2026-10-15T20:00"), endsAt: perth("2026-10-15T20:30") });
    const paused = computeStoreStatus(input("2026-10-15T20:10", { overrides: [close] }));
    expect(paused).toMatchObject({ open: false, reason: "paused" });
    expect(paused.nextOpen).toEqual(perth("2026-10-15T20:30"));
    expect(computeStoreStatus(input("2026-10-15T20:31", { overrides: [close] })).open).toBe(true);
  });

  it("a pause that ends after the cut-off reports the next scheduled opening", () => {
    const close = override({ mode: "closed", startsAt: perth("2026-10-15T21:00"), endsAt: perth("2026-10-15T21:45") });
    expect(computeStoreStatus(input("2026-10-15T21:10", { overrides: [close] })).nextOpen).toEqual(
      perth("2026-10-16T11:00"),
    );
  });

  it("the most recent active override wins", () => {
    const close = override({ id: "a", mode: "closed", startsAt: perth("2026-10-15T19:00") });
    const reopen = override({
      id: "b",
      mode: "open",
      startsAt: perth("2026-10-15T19:30"),
      endsAt: perth("2026-10-15T21:00"),
    });
    const s = computeStoreStatus(input("2026-10-15T20:00", { overrides: [close, reopen] }));
    expect(s).toMatchObject({ open: true, source: "override" });
    expect(s.activeOverride?.id).toBe("b");
  });

  it("cleared overrides and delivery-only overrides don't affect pickup", () => {
    const cleared = override({
      mode: "closed",
      startsAt: perth("2026-10-15T19:00"),
      clearedAt: perth("2026-10-15T19:10"),
    });
    const deliveryOnly = override({ mode: "closed", scope: "delivery", startsAt: perth("2026-10-15T19:00") });
    expect(computeStoreStatus(input("2026-10-15T20:00", { overrides: [cleared, deliveryOnly] }))).toMatchObject({
      open: true,
      source: "schedule",
    });
  });

  it("an override that hasn't started yet is ignored", () => {
    const later = override({ mode: "closed", startsAt: perth("2026-10-15T21:00") });
    expect(computeStoreStatus(input("2026-10-15T20:00", { overrides: [later] })).open).toBe(true);
  });

  it("'Open now' with less than the prep time left → closed", () => {
    const open = override({ mode: "open", startsAt: perth("2026-10-20T13:00"), endsAt: perth("2026-10-20T14:05") });
    expect(computeStoreStatus(input("2026-10-20T14:00", { overrides: [open] }))).toMatchObject({
      open: false,
      reason: "outside_hours",
    });
  });
});

describe("kill switch", () => {
  it("beats everything, including an 'Open now' override, and gives no reopening time", () => {
    const open = override({ mode: "open", startsAt: perth("2026-10-15T19:00"), endsAt: perth("2026-10-15T23:00") });
    const s = computeStoreStatus({
      ...input("2026-10-15T20:00", { overrides: [open] }),
      settings: { ...input("2026-10-15T20:00").settings, onlineOrderingEnabled: false },
    });
    expect(s).toMatchObject({ open: false, reason: "unavailable", nextOpen: null, source: "kill_switch" });
  });
});

describe("date exceptions", () => {
  const diwali: DateException = {
    tradingDate: "2026-10-16",
    kind: "closed",
    opensAt: null,
    closesAt: null,
    closesNextDay: false,
    publicNote: "Closed for Diwali",
  };

  it("a closed day shows its public note", () => {
    const s = computeStoreStatus(input("2026-10-16T12:00", { dateExceptions: [diwali] }));
    expect(s).toMatchObject({ open: false, reason: "outside_hours", notice: "Closed for Diwali", source: "exception" });
    expect(s.nextOpen).toEqual(perth("2026-10-17T11:00"));
  });

  it("'Closed Friday' also closes 00:00–01:00 Saturday (BR-AV-2)", () => {
    expect(computeStoreStatus(input("2026-10-16T23:50")).open).toBe(true);
    expect(computeStoreStatus(input("2026-10-17T00:10", { dateExceptions: [diwali] })).open).toBe(false);
  });

  it("special hours replace the weekly hours for that day", () => {
    const special: DateException = {
      tradingDate: "2026-10-21",
      kind: "special_hours",
      opensAt: "17:00",
      closesAt: "00:00",
      closesNextDay: true,
      publicNote: "Open late for the festival",
    };
    const noon = computeStoreStatus(input("2026-10-21T12:00", { dateExceptions: [special] }));
    expect(noon).toMatchObject({ open: false, notice: "Open late for the festival" });
    expect(noon.nextOpen).toEqual(perth("2026-10-21T17:00"));

    const evening = computeStoreStatus(input("2026-10-21T22:30", { dateExceptions: [special] }));
    expect(evening).toMatchObject({ open: true, source: "exception" });
    expect(evening.orderingUntil).toEqual(perth("2026-10-21T23:30"));
  });

  it("nextOpen skips a future closed day", () => {
    const closedWed: DateException = { ...diwali, tradingDate: "2026-10-21", publicNote: null };
    expect(computeStoreStatus(input("2026-10-20T14:00", { dateExceptions: [closedWed] })).nextOpen).toEqual(
      perth("2026-10-22T11:00"),
    );
  });
});

describe("window edges", () => {
  it("opens exactly at the opening time", () => {
    const before = computeStoreStatus(input("2026-10-19T10:59"));
    expect(before.open).toBe(false);
    expect(before.nextOpen).toEqual(perth("2026-10-19T11:00"));
    expect(computeStoreStatus(input("2026-10-19T11:00")).open).toBe(true);
  });

  it("accepts an order with exactly the prep time left, not a minute less", () => {
    expect(computeStoreStatus(input("2026-10-19T21:20")).open).toBe(true); // 21:20 + 10 = 21:30 cut-off
    const late = computeStoreStatus(input("2026-10-19T21:21"));
    expect(late.open).toBe(false);
    expect(late.nextOpen).toEqual(perth("2026-10-21T11:00")); // Tuesday is closed
  });

  it("the trading day rolls over at 05:00 (Sat 04:59 is still Friday)", () => {
    const close = override({ mode: "closed", startsAt: perth("2026-10-16T22:00") }); // Friday, until reopened
    expect(computeStoreStatus(input("2026-10-17T04:59", { overrides: [close] })).reason).toBe("paused");
    expect(computeStoreStatus(input("2026-10-17T05:00", { overrides: [close] })).reason).toBe("outside_hours");
  });

  it("split shifts: closed between windows, opens again the same day", () => {
    const split: WeeklyWindow[] = [
      { weekday: 1, opensAt: "11:00", closesAt: "14:00", closesNextDay: false },
      { weekday: 1, opensAt: "17:00", closesAt: "22:00", closesNextDay: false },
    ];
    const s = computeStoreStatus(input("2026-10-19T15:00", { weeklyHours: split }));
    expect(s.open).toBe(false);
    expect(s.nextOpen).toEqual(perth("2026-10-19T17:00"));
  });

  it("no hours in the next 14 days → nextOpen is null", () => {
    expect(computeStoreStatus(input("2026-10-19T12:00", { weeklyHours: [] })).nextOpen).toBeNull();
  });

  it("Postgres-style HH:MM:SS times work the same", () => {
    const pgHours = SEED_HOURS.map((w) => ({ ...w, opensAt: `${w.opensAt}:00`, closesAt: `${w.closesAt}:00` }));
    expect(computeStoreStatus(input("2026-10-16T23:50", { weeklyHours: pgHours })).orderingUntil).toEqual(
      perth("2026-10-17T00:30"),
    );
  });
});
