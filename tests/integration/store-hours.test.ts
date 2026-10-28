import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { fixedClock } from "@/domain/clock";
import { dateExceptions } from "@/server/db/schema";
import { storeHoursResponse } from "@/server/routes/store-status";
import { loadAvailabilityInput } from "@/server/store/schedule-repository";
import { SEED_SETTINGS, SEED_WEEKLY_HOURS } from "@/server/store/seed";
import { createTestDb, type TestDb } from "../support/db";

let t: TestDb;

beforeAll(async () => {
  t = await createTestDb();
});

afterAll(async () => {
  await t.dispose();
});

describe("seed constants match the database seed", () => {
  it("SEED_WEEKLY_HOURS and SEED_SETTINGS equal what migrations 0000–0004 create", async () => {
    // The local-dev preview uses the constants; this pins them to the real seed so they can't drift.
    const input = await loadAvailabilityInput(t.db, new Date("2026-10-21T04:00:00Z"));
    const sort = (w: (typeof SEED_WEEKLY_HOURS)[number][]) => [...w].sort((a, b) => a.weekday - b.weekday);
    expect(sort(input.weeklyHours)).toEqual(sort(SEED_WEEKLY_HOURS));
    expect(input.settings).toEqual(SEED_SETTINGS);
  });
});

describe("GET /api/v1/store/hours", () => {
  it("returns the week and upcoming closures with a 5-minute cache", async () => {
    await t.db.insert(dateExceptions).values({
      tradingDate: "2026-10-24",
      kind: "closed",
      reason: "Festival",
      publicNote: "Closed for Diwali",
      createdBy: randomUUID(),
    });
    const res = await storeHoursResponse(t.db, fixedClock("2026-10-21T04:00:00Z"));
    expect(res.headers.get("cache-control")).toBe("public, max-age=300");
    expect(res.headers.get("x-schedule-source")).toBeNull();
    const body = (await res.json()) as { week: unknown[]; upcoming: Array<{ note: string }>; todayWeekday: number };
    expect(body.week).toHaveLength(7);
    expect(body.todayWeekday).toBe(3);
    expect(body.upcoming).toEqual([expect.objectContaining({ dateLabel: "Sat 24 Oct", note: "Closed for Diwali" })]);
  });
});
