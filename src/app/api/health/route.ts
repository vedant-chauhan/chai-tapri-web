import { systemClock } from "@/domain/clock";
import { getEnv } from "@/lib/env";
import { withDb } from "@/server/db/client";
import { handleRequest } from "@/server/http";
import { healthResponse } from "@/server/routes/health";

// Always evaluated at request time; never prerendered or cached.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handleRequest(request, async ({ log }) => {
    const url = getEnv().DATABASE_URL;
    if (!url) return healthResponse({ db: null, clock: systemClock, log });
    return withDb(url, (db) => healthResponse({ db, clock: systemClock, log }));
  });
}
