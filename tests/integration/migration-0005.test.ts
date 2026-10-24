import { readFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "../support/db";

/** Migration 0005 must keep every existing staff role when it moves the column (project lead, 24 Oct 2026). */
describe("migration 0005: staff_roles → staff_users.role", () => {
  let t: TestDb;
  const rows = <T>(r: unknown) => (r as { rows: T[] }).rows;

  beforeAll(async () => {
    t = await createTestDb();
    // Recreate the pre-0005 shape on top of the migrated schema, with data in it.
    await t.db.execute(sql`alter table staff_users drop constraint staff_users_role_valid`);
    await t.db.execute(sql`alter table staff_users drop column role`);
    await t.db.execute(
      sql`create table staff_roles (user_id text primary key references staff_users(id), role text not null)`,
    );
    await t.db.execute(
      sql`insert into staff_users (id, name, email) values ('u1', 'Owner', 'o@example.com'), ('u2', 'Staff', 's@example.com'), ('u3', 'Left', 'l@example.com')`,
    );
    await t.db.execute(sql`insert into staff_roles values ('u1', 'owner'), ('u2', 'staff')`);
    // Apply the migration's statements exactly as written.
    for (const stmt of readFileSync("db/migrations/0005_merge_staff_roles.sql", "utf8").split(
      "--> statement-breakpoint",
    )) {
      await t.db.execute(sql.raw(stmt));
    }
  });

  afterAll(async () => {
    await t.dispose();
  });

  it("copies every role and leaves users without one as null", async () => {
    const result = rows<{ id: string; role: string | null }>(
      await t.db.execute(sql`select id, role from staff_users order by id`),
    );
    expect(result).toEqual([
      { id: "u1", role: "owner" },
      { id: "u2", role: "staff" },
      { id: "u3", role: null },
    ]);
  });

  it("drops staff_roles and enforces valid roles", async () => {
    const tables = rows<{ n: number }>(
      await t.db.execute(
        sql`select count(*)::int as n from information_schema.tables where table_name = 'staff_roles'`,
      ),
    );
    expect(tables[0].n).toBe(0);
    await expect(t.db.execute(sql`update staff_users set role = 'admin' where id = 'u1'`)).rejects.toThrow();
  });
});
