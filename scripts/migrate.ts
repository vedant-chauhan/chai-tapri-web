/**
 * Applies db/migrations to DATABASE_URL. One tool for every environment (DATABASE.md §6).
 *
 *   DATABASE_URL=postgres://… pnpm db:migrate
 *   DATABASE_URL=pglite://./.data/dev pnpm db:migrate
 *
 * Prints only the database kind and host, never the connection string.
 */
import { connectNode } from "../src/server/db/node";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  const target = url.startsWith("pglite://") ? url : new URL(url).host;
  const conn = await connectNode(url);
  try {
    console.log(`Applying migrations to ${conn.kind} (${target})…`);
    await conn.migrate();
    console.log("Migrations applied.");
  } finally {
    await conn.close();
  }
}

main().catch((err: unknown) => {
  console.error("Migration failed:", err instanceof Error ? err.message : "unknown error");
  process.exit(1);
});
