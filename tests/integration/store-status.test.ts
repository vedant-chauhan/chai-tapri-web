import { randomUUID } from "node:crypto";
import { eq, isNull } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { fixedClock } from "@/domain/clock";
import { auditLog, dateExceptions, orderingOverrides, storeSettings, weeklyHours } from "@/server/db/schema";
import { readJson } from "@/server/routes/body";
import { staffOrderingResponse, storeStatusResponse } from "@/server/routes/store-status";
import {
  closeBodySchema,
  closeOrdering,
  clearOverride,
  openBodySchema,
  openOrdering,
  type Actor,
} from "@/server/store/ordering-controls";
import { createTestDb, type TestDb } from "../support/db";

/** Perth wall clock → instant (Perth = UTC+8, no DST). */
const perth = (local: string) => new Date(`${local}:00+08:00`);
const at = (local: string) => fixedClock(perth(local));

const owner: Actor = { userId: randomUUID(), role: "owner" };
const manager: Actor = { userId: randomUUID(), role: "manager" };
const staff: Actor = { userId: randomUUID(), role: "staff" };

let t: TestDb;

beforeAll(async () => {
  t = await createTestDb();
});

afterAll(async () => {
  await t.dispose();
});

beforeEach(async () => {
  await t.db.delete(orderingOverrides);
  await t.db.delete(dateExceptions);
  await t.db.delete(auditLog);
  await t.db.update(storeSettings).set({ onlineOrderingEnabled: true }).where(eq(storeSettings.id, 1));
});

async function publicStatus(local: string) {
  const res = await storeStatusResponse(t.db, at(local));
  return { res, body: (await res.json()) as Record<string, unknown> };
}

async function staffView(local: string) {
  const res = await staffOrderingResponse(t.db, at(local));
  return (await res.json()) as { status: Record<string, unknown>; override: Record<string, unknown> | null };
}

describe("seeded weekly hours [Assumption Q15]", () => {
  it("has Mon/Wed/Thu/Sun 11–22, Fri/Sat 11–01, Tuesday closed", async () => {
    const rows = await t.db.select().from(weeklyHours).orderBy(weeklyHours.weekday);
    expect(rows.map((r) => [r.weekday, r.opensAt, r.closesAt, r.closesNextDay])).toEqual([
      [1, "11:00:00", "22:00:00", false],
      [3, "11:00:00", "22:00:00", false],
      [4, "11:00:00", "22:00:00", false],
      [5, "11:00:00", "01:00:00", true],
      [6, "11:00:00", "01:00:00", true],
      [7, "11:00:00", "22:00:00", false],
    ]);
  });
});

describe("GET /api/v1/store/status", () => {
  it("open: API.md shape, Perth labels, 10 s public cache", async () => {
    const { res, body } = await publicStatus("2026-10-16T23:50");
    expect(res.headers.get("cache-control")).toBe("public, max-age=10");
    expect(body).toEqual({
      open: true,
      reason: null,
      orderingUntil: "2026-10-16T16:30:00.000Z",
      orderingUntilLabel: "12:30am",
      nextOpen: null,
      nextOpenLabel: null,
      notice: null,
      prepMinutes: 10,
    });
  });

  it("Tuesday: closed, opens Wed 11am", async () => {
    const { body } = await publicStatus("2026-10-20T14:00");
    expect(body).toMatchObject({
      open: false,
      reason: "outside_hours",
      nextOpen: "2026-10-21T03:00:00.000Z",
      nextOpenLabel: "Wed 11am",
    });
  });

  it("a closed date exception shows its public note", async () => {
    await t.db.insert(dateExceptions).values({
      tradingDate: "2026-10-16",
      kind: "closed",
      reason: "Staff holiday",
      publicNote: "Closed for Diwali",
      createdBy: owner.userId,
    });
    const { body } = await publicStatus("2026-10-16T12:00");
    expect(body).toMatchObject({ open: false, notice: "Closed for Diwali", nextOpenLabel: "Sat 11am" });
  });

  it("kill switch → unavailable with no reopening time", async () => {
    await t.db.update(storeSettings).set({ onlineOrderingEnabled: false }).where(eq(storeSettings.id, 1));
    const { body } = await publicStatus("2026-10-16T12:00");
    expect(body).toMatchObject({ open: false, reason: "unavailable", nextOpen: null });
  });
});

describe("Close now", () => {
  it("staff can close for up to 2 hours", async () => {
    const clock = at("2026-10-15T19:00");
    await closeOrdering(
      { db: t.db, clock, actor: staff },
      { until: perth("2026-10-15T19:30").toISOString(), reason: "Kitchen backed up" },
    );
    const view = await staffView("2026-10-15T19:10");
    expect(view.status).toMatchObject({ open: false, reason: "paused", nextOpenLabel: "7:30pm today" });
    expect(view.override).toMatchObject({ mode: "closed", untilReopened: false, endsAtLabel: "7:30pm" });
    expect((await staffView("2026-10-15T19:31")).status.open).toBe(true);
  });

  it("staff must give an end time, and no more than 2 hours away", async () => {
    const deps = { db: t.db, clock: at("2026-10-15T19:00"), actor: staff };
    await expect(closeOrdering(deps, { until: null })).rejects.toMatchObject({ code: "validation_failed" });
    await expect(closeOrdering(deps, { until: perth("2026-10-15T21:01").toISOString() })).rejects.toMatchObject({
      code: "validation_failed",
    });
  });

  it("a manager can close until reopened; it lasts to the end of the trading day", async () => {
    await closeOrdering({ db: t.db, clock: at("2026-10-15T20:00"), actor: manager }, { until: null });
    const view = await staffView("2026-10-15T20:30");
    expect(view.status).toMatchObject({ reason: "paused", nextOpenLabel: "Fri 11am" });
    expect(view.override).toMatchObject({ untilReopened: true, endsAt: perth("2026-10-16T05:00").toISOString() });
    expect((await staffView("2026-10-16T11:05")).status.open).toBe(true);
  });

  it("rejects end times in the past or beyond the trading day", async () => {
    const deps = { db: t.db, clock: at("2026-10-15T20:00"), actor: owner };
    await expect(closeOrdering(deps, { until: perth("2026-10-15T19:00").toISOString() })).rejects.toMatchObject({
      code: "validation_failed",
    });
    await expect(closeOrdering(deps, { until: perth("2026-10-16T12:00").toISOString() })).rejects.toMatchObject({
      code: "validation_failed",
    });
  });

  it("is audited", async () => {
    await closeOrdering({ db: t.db, clock: at("2026-10-15T19:00"), actor: manager }, { until: null, reason: "Rush" });
    const [entry] = await t.db.select().from(auditLog);
    expect(entry).toMatchObject({ actorId: manager.userId, action: "ordering.close", entity: "ordering_override" });
    expect(entry.after).toMatchObject({ mode: "closed", endsAt: null, reason: "Rush" });
  });
});

describe("Open now until …", () => {
  it("owner opens on a Tuesday (outside hours) until 16:00", async () => {
    await openOrdering(
      { db: t.db, clock: at("2026-10-20T13:55"), actor: owner },
      { until: perth("2026-10-20T16:00").toISOString() },
    );
    const view = await staffView("2026-10-20T14:00");
    expect(view.status).toMatchObject({ open: true, orderingUntilLabel: "4pm" });
    expect((await staffView("2026-10-20T16:00")).status.open).toBe(false);
  });

  it("only the owner can open", async () => {
    for (const actor of [staff, manager]) {
      await expect(
        openOrdering(
          { db: t.db, clock: at("2026-10-20T13:55"), actor },
          { until: perth("2026-10-20T16:00").toISOString() },
        ),
      ).rejects.toMatchObject({ code: "forbidden" });
    }
  });

  it("an end time is required (422 until_required) and must fit the trading day", async () => {
    const deps = { db: t.db, clock: at("2026-10-15T21:40"), actor: owner };
    await expect(openOrdering(deps, {})).rejects.toMatchObject({ code: "until_required", status: 422 });
    await expect(openOrdering(deps, { until: perth("2026-10-16T06:00").toISOString() })).rejects.toMatchObject({
      code: "validation_failed",
    });
    await expect(openOrdering(deps, { until: perth("2026-10-15T21:45").toISOString() })).rejects.toMatchObject({
      code: "validation_failed",
    }); // less than the 10 min prep time
  });

  it("replaces an active close; the old one is kept as cleared history", async () => {
    await closeOrdering({ db: t.db, clock: at("2026-10-15T19:00"), actor: manager }, { until: null });
    await openOrdering(
      { db: t.db, clock: at("2026-10-15T19:30"), actor: owner },
      { until: perth("2026-10-15T23:00").toISOString() },
    );
    const rows = await t.db.select().from(orderingOverrides).orderBy(orderingOverrides.startsAt);
    expect(rows.map((r) => [r.mode, r.clearedBy !== null])).toEqual([
      ["closed", true],
      ["open", false],
    ]);
    expect((await staffView("2026-10-15T22:00")).status).toMatchObject({ open: true, orderingUntilLabel: "11pm" });
  });
});

describe("Back to schedule", () => {
  it("staff can clear their own close", async () => {
    await closeOrdering(
      { db: t.db, clock: at("2026-10-15T19:00"), actor: staff },
      { until: perth("2026-10-15T20:00").toISOString() },
    );
    await clearOverride({ db: t.db, clock: at("2026-10-15T19:10"), actor: staff });
    expect((await staffView("2026-10-15T19:11")).status.open).toBe(true);
  });

  it("staff can't clear the owner's override; the owner can clear anything", async () => {
    await openOrdering(
      { db: t.db, clock: at("2026-10-20T13:00"), actor: owner },
      { until: perth("2026-10-20T16:00").toISOString() },
    );
    await expect(clearOverride({ db: t.db, clock: at("2026-10-20T13:10"), actor: staff })).rejects.toMatchObject({
      code: "forbidden",
    });
    await clearOverride({ db: t.db, clock: at("2026-10-20T13:10"), actor: owner });
    expect(await t.db.select().from(orderingOverrides).where(isNull(orderingOverrides.clearedAt))).toHaveLength(0);
    expect((await staffView("2026-10-20T13:11")).status.open).toBe(false); // Tuesday: back to closed
  });

  it("is idempotent when nothing is active, and audited when something is", async () => {
    await clearOverride({ db: t.db, clock: at("2026-10-15T19:00"), actor: owner });
    expect(await t.db.select().from(auditLog)).toHaveLength(0);
    await closeOrdering({ db: t.db, clock: at("2026-10-15T19:00"), actor: owner }, { until: null });
    await clearOverride({ db: t.db, clock: at("2026-10-15T19:05"), actor: owner });
    const actions = (await t.db.select().from(auditLog).orderBy(auditLog.id)).map((a) => a.action);
    expect(actions).toEqual(["ordering.close", "ordering.override_clear"]);
  });
});

describe("request bodies (API.md: unknown fields → 400)", () => {
  const req = (body: string) => new Request("https://x/api", { method: "POST", body });

  it("rejects bad JSON, unknown fields and non-ISO times", async () => {
    await expect(readJson(req("{"), closeBodySchema)).rejects.toMatchObject({ code: "validation_failed" });
    await expect(readJson(req('{"until":null,"extra":1}'), closeBodySchema)).rejects.toMatchObject({
      code: "validation_failed",
    });
    await expect(readJson(req('{"until":"tomorrow"}'), openBodySchema)).rejects.toMatchObject({
      code: "validation_failed",
    });
  });

  it("accepts valid bodies", async () => {
    await expect(readJson(req('{"until":null,"reason":"Rush"}'), closeBodySchema)).resolves.toEqual({
      until: null,
      reason: "Rush",
    });
    await expect(readJson(req('{"until":"2026-10-20T16:00:00+08:00"}'), openBodySchema)).resolves.toEqual({
      until: "2026-10-20T16:00:00+08:00",
    });
  });
});
