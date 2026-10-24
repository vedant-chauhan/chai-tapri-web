import { afterEach, describe, expect, it, vi } from "vitest";
import { fixedClock, localParts, systemClock, tradingDate } from "@/domain/clock";

describe("localParts", () => {
  it("converts UTC to Perth wall-clock time (UTC+8, no DST)", () => {
    // 2026-10-16 15:50 UTC = Fri 16 Oct 23:50 Perth
    expect(localParts(new Date("2026-10-16T15:50:00Z"))).toEqual({
      date: "2026-10-16",
      time: "23:50",
      weekday: 5,
    });
  });

  it("has no daylight-saving shift in January", () => {
    expect(localParts(new Date("2027-01-15T04:00:00Z")).time).toBe("12:00");
  });
});

describe("tradingDate (BR-AV-2)", () => {
  it("keeps 04:59 local in the previous trading day", () => {
    // Sat 17 Oct 04:59 Perth
    expect(tradingDate(new Date("2026-10-16T20:59:00Z"))).toBe("2026-10-16");
  });

  it("starts the new trading day at 05:00 local", () => {
    expect(tradingDate(new Date("2026-10-16T21:00:00Z"))).toBe("2026-10-17");
  });

  it("puts 00:30 Saturday into Friday's trading day", () => {
    expect(tradingDate(new Date("2026-10-16T16:30:00Z"))).toBe("2026-10-16");
  });

  it("rolls back across a month and year boundary", () => {
    // Fri 1 Jan 2027 02:00 Perth → trading day 31 Dec 2026
    expect(tradingDate(new Date("2026-12-31T18:00:00Z"))).toBe("2026-12-31");
  });

  it("rejects a malformed boundary", () => {
    expect(() => tradingDate(new Date(), "5am")).toThrow(RangeError);
  });
});

describe("clocks", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("fixedClock always returns the pinned instant", () => {
    const clock = fixedClock("2026-10-16T15:50:00Z");
    expect(clock.now().toISOString()).toBe("2026-10-16T15:50:00.000Z");
    clock.now().setFullYear(2000); // mutating a returned Date must not move the clock
    expect(clock.now().toISOString()).toBe("2026-10-16T15:50:00.000Z");
  });

  it("fixedClock rejects an invalid instant", () => {
    expect(() => fixedClock("not a date")).toThrow(RangeError);
  });

  it("systemClock follows Vitest's fake timers", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-16T21:00:00Z"));
    expect(tradingDate(systemClock.now())).toBe("2026-10-17");
  });
});

describe("zonedInstant / labels", () => {
  it("converts Perth wall-clock time to an instant", async () => {
    const { zonedInstant } = await import("@/domain/clock");
    expect(zonedInstant("2026-10-17", "00:30").toISOString()).toBe("2026-10-16T16:30:00.000Z");
    expect(zonedInstant("2026-10-17", "00:30:00").toISOString()).toBe("2026-10-16T16:30:00.000Z");
  });

  it("formats status-chip times", async () => {
    const { timeLabel, nextOpenLabel } = await import("@/domain/clock");
    expect(timeLabel(new Date("2026-10-15T13:30:00Z"))).toBe("9:30pm");
    expect(timeLabel(new Date("2026-10-16T03:00:00Z"))).toBe("11am");
    expect(timeLabel(new Date("2026-10-16T16:00:00Z"))).toBe("12am");
    expect(timeLabel(new Date("2026-10-16T04:15:00Z"))).toBe("12:15pm");
    const now = new Date("2026-10-20T06:00:00Z"); // Tue 14:00
    expect(nextOpenLabel(new Date("2026-10-21T03:00:00Z"), now)).toBe("Wed 11am");
    expect(nextOpenLabel(new Date("2026-10-20T09:00:00Z"), now)).toBe("5pm today");
  });
});
