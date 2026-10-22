import { systemClock } from "@/domain/clock";
import { getEnv } from "@/lib/env";
import { ApiError } from "@/lib/errors";
import { withDb } from "@/server/db/client";
import { handleRequest } from "@/server/http";
import { cronSweepResponse } from "@/server/routes/cron-sweep";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handleRequest(request, async ({ log }) => {
    const env = getEnv();
    return cronSweepResponse(request, {
      cronSecret: env.CRON_SECRET,
      log,
      withSweepDeps: (fn) => {
        if (!env.DATABASE_URL) throw new ApiError("internal", { message: "Database is not configured." });
        return withDb(env.DATABASE_URL, (db) => fn({ db, clock: systemClock, log }));
      },
    });
  });
}
