/**
 * Fresh, migrated database per test file.
 *
 * - Default: PGlite in memory (CLAUDE.md "Local DB for tests").
 * - TEST_DATABASE_URL=postgres://… (CI Postgres 16 service): creates a throwaway database,
 *   migrates it, and drops it afterwards, so test files never share state.
 */
import { randomBytes } from "node:crypto";
import { Client } from "pg";
import { connectNode, type NodeDb } from "@/server/db/node";

export interface TestDb extends NodeDb {
  /** Drops the throwaway database (Postgres) and closes connections. */
  dispose: () => Promise<void>;
}

export async function createTestDb({ migrate = true } = {}): Promise<TestDb> {
  const serverUrl = process.env.TEST_DATABASE_URL;

  if (!serverUrl) {
    const conn = await connectNode("pglite://memory");
    if (migrate) await conn.migrate();
    return { ...conn, dispose: conn.close };
  }

  const name = `test_${randomBytes(6).toString("hex")}`;
  const admin = new Client({ connectionString: serverUrl });
  await admin.connect();
  await admin.query(`create database ${name}`);
  await admin.end();

  const url = new URL(serverUrl);
  url.pathname = `/${name}`;
  const conn = await connectNode(url.toString());
  if (migrate) await conn.migrate();

  return {
    ...conn,
    dispose: async () => {
      await conn.close();
      const cleanup = new Client({ connectionString: serverUrl });
      await cleanup.connect();
      await cleanup.query(`drop database if exists ${name} with (force)`);
      await cleanup.end();
    },
  };
}
