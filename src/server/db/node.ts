/**
 * Database connections for Node-only code: scripts (migrate, create-owner) and tests.
 * Never imported by the app (the Worker uses ./client.ts).
 *
 *   pglite://memory          in-process Postgres, in memory (tests)
 *   pglite://./.data/dev     in-process Postgres persisted to a directory
 *   postgres://…             real Postgres via node-postgres (local docker, CI service, Neon)
 */
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { migrate as migratePg } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import * as schema from "./schema";
import type { Db } from "./types";

export const MIGRATIONS_FOLDER = "db/migrations";

export interface NodeDb {
  db: Db;
  kind: "pglite" | "postgres";
  migrate: () => Promise<void>;
  close: () => Promise<void>;
}

export async function connectNode(url: string): Promise<NodeDb> {
  if (url.startsWith("pglite://")) {
    const target = url.slice("pglite://".length);
    const client = target === "memory" || target === "" ? new PGlite() : new PGlite(target);
    await client.waitReady;
    const db = drizzlePglite({ client, schema });
    return {
      db: db as unknown as Db,
      kind: "pglite",
      migrate: () => migratePglite(db, { migrationsFolder: MIGRATIONS_FOLDER }),
      close: () => client.close(),
    };
  }

  if (/^postgres(ql)?:\/\//.test(url)) {
    const pool = new Pool({ connectionString: url, max: 4 });
    const db = drizzlePg({ client: pool, schema });
    return {
      db: db as unknown as Db,
      kind: "postgres",
      migrate: () => migratePg(db, { migrationsFolder: MIGRATIONS_FOLDER }),
      close: () => pool.end(),
    };
  }

  throw new Error("Unsupported database URL: expected postgres://… or pglite://…");
}
