import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { cronHeartbeats, storeSettings } from "@/server/db/schema";
import { createTestDb, type TestDb } from "../support/db";

describe("migrations on a fresh database (F4-3)", () => {
  let t: TestDb;

  beforeAll(async () => {
    t = await createTestDb({ migrate: false });
    await t.migrate();
  });

  afterAll(async () => {
    await t.dispose();
  });

  it("creates the foundation tables", async () => {
    // Both PGlite and node-postgres return `{ rows }`; the driver-agnostic Db type can't express that.
    const result = (await t.db.execute(
      sql`select table_name from information_schema.tables where table_schema = 'public' order by table_name`,
    )) as unknown as { rows: Array<{ table_name: string }> };
    const tables = result.rows.map((r) => r.table_name);
    expect(tables).toEqual(expect.arrayContaining(["cron_heartbeats", "store_settings"]));
  });

  it("seeds the store_settings singleton with the schema defaults", async () => {
    const rows = await t.db.select().from(storeSettings);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: 1,
      timezone: "Australia/Perth",
      tradingDayBoundary: "05:00:00",
      prepMinutesDefault: 10,
      lastOrderOffsetMinutes: 30,
      acceptTimeoutSeconds: 300,
      onlineOrderingEnabled: true,
    });
  });

  it("enforces the singleton and range checks", async () => {
    await expect(t.db.insert(storeSettings).values({ id: 2 })).rejects.toThrow();
    await expect(
      t.db.update(storeSettings).set({ acceptTimeoutSeconds: 10 }).where(eq(storeSettings.id, 1)),
    ).rejects.toThrow();
  });

  it("is safe to run again (no-op)", async () => {
    await expect(t.migrate()).resolves.toBeUndefined();
    expect(await t.db.select().from(storeSettings)).toHaveLength(1);
  });

  it("upserts heartbeats by name", async () => {
    const at = new Date("2026-10-16T15:50:00Z");
    for (const ok of [true, false]) {
      await t.db
        .insert(cronHeartbeats)
        .values({ name: "sweep", lastRunAt: at, lastOk: ok })
        .onConflictDoUpdate({ target: cronHeartbeats.name, set: { lastRunAt: at, lastOk: ok } });
    }
    const rows = await t.db.select().from(cronHeartbeats);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ name: "sweep", lastOk: false });
    expect(rows[0].lastRunAt.toISOString()).toBe(at.toISOString());
  });
});
