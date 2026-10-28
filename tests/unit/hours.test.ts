import { describe, expect, it } from "vitest";
import type { AvailabilityInput } from "@/domain/availability";
import { dateLabel, wallTimeLabel } from "@/domain/clock";
import { toHoursDto } from "@/server/store/hours";
import { SEED_SETTINGS, SEED_WEEKLY_HOURS } from "@/server/store/seed";
import { statusText } from "@/ui/status-chip";

const input = (now: string, extra: Partial<AvailabilityInput> = {}): AvailabilityInput => ({
  now: new Date(`${now}:00+08:00`),
  settings: SEED_SETTINGS,
  weeklyHours: SEED_WEEKLY_HOURS,
  dateExceptions: [],
  overrides: [],
  ...extra,
});

describe("labels", () => {
  it.each([
    ["11:00", "11am"],
    ["22:00:00", "10pm"],
    ["21:30", "9:30pm"],
    ["00:00", "12am"],
    ["12:00", "12pm"],
    ["01:00", "1am"],
  ])("wallTimeLabel(%s) = %s", (t, label) => {
    expect(wallTimeLabel(t)).toBe(label);
  });

  it("dateLabel", () => {
    expect(dateLabel("2026-10-30")).toBe("Fri 30 Oct");
    expect(dateLabel("2027-01-01")).toBe("Fri 1 Jan");
  });
});

describe("toHoursDto", () => {
  it("lists Monday→Sunday with Tuesday closed and late Fri/Sat", () => {
    const dto = toHoursDto(input("2026-10-21T12:00"));
    expect(dto.week.map((d) => [d.day, d.windows.map((w) => `${w.opens}–${w.closes}`).join(", ") || "Closed"])).toEqual(
      [
        ["Mon", "11am–10pm"],
        ["Tue", "Closed"],
        ["Wed", "11am–10pm"],
        ["Thu", "11am–10pm"],
        ["Fri", "11am–1am"],
        ["Sat", "11am–1am"],
        ["Sun", "11am–10pm"],
      ],
    );
    expect(dto.todayWeekday).toBe(3);
  });

  it("'today' follows the trading day: Sat 00:30 is still Friday", () => {
    expect(toHoursDto(input("2026-10-17T00:30")).todayWeekday).toBe(5);
  });

  it("shows closures and special hours in the next 14 days only, in date order", () => {
    const ex = (tradingDate: string, kind: "closed" | "special_hours", note: string | null = null) => ({
      tradingDate,
      kind,
      opensAt: kind === "closed" ? null : "17:00",
      closesAt: kind === "closed" ? null : "23:00",
      closesNextDay: false,
      publicNote: note,
    });
    const dto = toHoursDto(
      input("2026-10-21T12:00", {
        dateExceptions: [
          ex("2026-11-20", "closed"), // > 14 days: hidden
          ex("2026-10-30", "special_hours"),
          ex("2026-10-24", "closed", "Closed for Diwali"),
          ex("2026-10-20", "closed"), // yesterday: hidden
        ],
      }),
    );
    expect(dto.upcoming).toEqual([
      { date: "2026-10-24", dateLabel: "Sat 24 Oct", kind: "closed", windows: [], note: "Closed for Diwali" },
      {
        date: "2026-10-30",
        dateLabel: "Fri 30 Oct",
        kind: "special_hours",
        windows: [{ opens: "5pm", closes: "11pm", closesNextDay: false }],
        note: null,
      },
    ]);
  });
});

describe("status chip wording (never colour alone)", () => {
  const ready = (data: object) => ({ state: "ready" as const, data: data as never });

  it.each([
    [{ state: "loading" as const }, "Checking opening hours…"],
    [{ state: "error" as const }, "Can't confirm opening hours right now"],
    [ready({ open: true, orderingUntilLabel: "9:30pm" }), "Open · online orders until 9:30pm"],
    [ready({ open: false, reason: "outside_hours", nextOpenLabel: "Wed 11am" }), "Closed · opens Wed 11am"],
    [
      ready({ open: false, reason: "paused", nextOpenLabel: "7:30pm today" }),
      "Online orders paused by the shop · opens 7:30pm today",
    ],
    [ready({ open: false, reason: "unavailable", nextOpenLabel: null }), "Online ordering is unavailable right now"],
    [ready({ open: false, reason: "outside_hours", nextOpenLabel: null }), "Closed"],
  ])("%j → %s", (remote, text) => {
    expect(statusText(remote as never).text).toBe(text);
  });
});
