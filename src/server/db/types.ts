import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import type * as schema from "./schema";

export type Schema = typeof schema;

/**
 * Driver-agnostic database handle. The Worker uses neon-serverless, scripts use node-postgres,
 * tests use PGlite or node-postgres; all share the same schema and SQL. Repositories and
 * domain services take a `Db` so tests can inject any of them.
 */
export type Db = PgDatabase<PgQueryResultHKT, Schema>;
