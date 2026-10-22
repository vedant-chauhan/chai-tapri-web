/** Request-scoped auth for route handlers, layouts and Server Actions. */
import "server-only";
import { createAuth, type Auth } from "./auth";
import { getEnv, requireEnv } from "@/lib/env";
import { withDb } from "@/server/db/client";
import type { Db } from "@/server/db/types";

const LOCAL_ORIGIN = "http://localhost:3000";

export async function withAuth<T>(fn: (ctx: { auth: Auth; db: Db }) => Promise<T>): Promise<T> {
  const env = getEnv();
  const url = requireEnv("DATABASE_URL");
  const secret = requireEnv("AUTH_SECRET");
  // Deployed envs must set AUTH_URL (env.ts enforces it); local dev falls back to next dev's origin.
  const baseURL = env.AUTH_URL ?? LOCAL_ORIGIN;
  return withDb(url, (db) => fn({ auth: createAuth({ db, secret, baseURL }), db }));
}
