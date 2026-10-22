/**
 * Runtime database client for the Worker (DATABASE.md §6 "Connections", ADR-0008/0012).
 *
 * Neon serverless driver over WebSockets, one pool per request, closed when the request
 * ends. No long-lived pool, so the Neon Free compute can scale to zero. Workers can't share
 * sockets between requests anyway.
 *
 *   const { db, close } = openDb(url);
 *   try { ... } finally { await close(); }
 */
import "server-only";
import { neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";
import type { Db } from "./types";

/** Request paths must fail fast rather than hold a request open (DATABASE.md §6). */
const STATEMENT_TIMEOUT_MS = 5_000;

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

/**
 * Local Postgres has no WebSocket endpoint. docker-compose.yml runs Neon's wsproxy on :5433,
 * so point the driver at it (plain ws, no TLS) when the database host is local.
 */
function configureForHost(url: string): void {
  const { hostname } = new URL(url);
  if (LOCAL_HOSTS.has(hostname)) {
    neonConfig.wsProxy = (host) => `${host}:5433/v1`;
    neonConfig.useSecureWebSocket = false;
    neonConfig.pipelineTLS = false;
    neonConfig.pipelineConnect = false;
  }
}

export interface DbHandle {
  db: Db;
  close: () => Promise<void>;
}

export function openDb(url: string): DbHandle {
  configureForHost(url);
  const pool = new Pool({ connectionString: url, max: 1 });
  pool.on("connect", (client: { query: (text: string) => Promise<unknown> }) => {
    void client.query(`set statement_timeout = ${STATEMENT_TIMEOUT_MS}`);
  });
  const db = drizzle({ client: pool, schema }) as unknown as Db;
  return { db, close: () => pool.end() };
}

/** Opens a request-scoped connection, runs `fn`, and always closes it. */
export async function withDb<T>(url: string, fn: (db: Db) => Promise<T>): Promise<T> {
  const { db, close } = openDb(url);
  try {
    return await fn(db);
  } finally {
    await close().catch(() => {});
  }
}
