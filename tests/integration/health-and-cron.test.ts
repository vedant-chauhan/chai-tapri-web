import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { fixedClock } from "@/domain/clock";
import { createLogger } from "@/lib/logger";
import { cronHeartbeats } from "@/server/db/schema";
import { handleRequest } from "@/server/http";
import { cronSweepResponse } from "@/server/routes/cron-sweep";
import { healthResponse } from "@/server/routes/health";
import { createTestDb, type TestDb } from "../support/db";

const log = createLogger({ sink: () => {} });
const NOW = new Date("2026-10-16T12:00:00Z");
const clock = fixedClock(NOW);
const SECRET = "s".repeat(40);

let t: TestDb;

beforeAll(async () => {
  t = await createTestDb();
});

afterAll(async () => {
  await t.dispose();
});

beforeEach(async () => {
  await t.db.delete(cronHeartbeats);
});

async function heartbeat(secondsAgo: number, ok = true) {
  await t.db.insert(cronHeartbeats).values({
    name: "sweep",
    lastRunAt: new Date(NOW.getTime() - secondsAgo * 1000),
    lastOk: ok,
  });
}

describe("GET /api/health", () => {
  it("200 when the DB answers and the sweep ran recently", async () => {
    await heartbeat(42);
    const res = await healthResponse({ db: t.db, clock, log });
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toEqual({ db: "ok", stripe: "not_configured", sweepLagSeconds: 42, sweepLastOk: true });
  });

  it("503 when the sweep has never run", async () => {
    const res = await healthResponse({ db: t.db, clock, log });
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ db: "ok", sweepLagSeconds: null });
  });

  it("503 when the sweep lags more than 5 minutes", async () => {
    await heartbeat(301);
    const res = await healthResponse({ db: t.db, clock, log });
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ db: "ok", sweepLagSeconds: 301 });
  });

  it("200 at exactly 5 minutes of lag", async () => {
    await heartbeat(300);
    expect((await healthResponse({ db: t.db, clock, log })).status).toBe(200);
  });

  it("503 when the database is not configured", async () => {
    const res = await healthResponse({ db: null, clock, log });
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ db: "error" });
  });

  it("503 when the database is unreachable", async () => {
    const broken = await createTestDb();
    await broken.dispose();
    const res = await healthResponse({ db: broken.db, clock, log });
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ db: "error" });
  });
});

describe("POST /api/cron/sweep", () => {
  const deps = (cronSecret: string | undefined) => ({
    cronSecret,
    log,
    withSweepDeps: <T>(fn: (d: { db: typeof t.db; clock: typeof clock; log: typeof log }) => Promise<T>) =>
      fn({ db: t.db, clock, log }),
  });

  const call = (headers: Record<string, string>, cronSecret: string | undefined = SECRET) => {
    const request = new Request("https://cron.internal/api/cron/sweep", { method: "POST", headers });
    return handleRequest(request, () => cronSweepResponse(request, deps(cronSecret)), log);
  };

  it("401 without the secret, in the API error shape", async () => {
    const res = await call({});
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: { code: string; requestId: string } };
    expect(body.error.code).toBe("unauthenticated");
    expect(body.error.requestId).toBe(res.headers.get("x-request-id"));
    expect(await t.db.select().from(cronHeartbeats)).toHaveLength(0);
  });

  it("401 with a wrong secret", async () => {
    expect((await call({ authorization: `Bearer ${"x".repeat(40)}` })).status).toBe(401);
  });

  it("401 when no CRON_SECRET is configured, even with a token (deny by default)", async () => {
    expect((await call({ authorization: "Bearer anything" }, undefined)).status).toBe(401);
  });

  it("200 with the secret, and writes the heartbeat health reads", async () => {
    const res = await call({ authorization: `Bearer ${SECRET}` });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, startedAt: NOW.toISOString() });

    const [row] = await t.db.select().from(cronHeartbeats);
    expect(row).toMatchObject({ name: "sweep", lastOk: true });
    expect(row.lastRunAt.toISOString()).toBe(NOW.toISOString());

    expect((await healthResponse({ db: t.db, clock, log })).status).toBe(200);
  });
});
