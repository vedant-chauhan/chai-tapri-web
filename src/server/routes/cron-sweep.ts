/**
 * POST /api/cron/sweep: `Authorization: Bearer $CRON_SECRET` (SECURITY.md slice-1 table).
 * Deny by default: with no CRON_SECRET configured, every call is rejected.
 */
import { runSweep, type SweepDeps } from "../sweep";
import { ApiError } from "@/lib/errors";
import { bearerToken, timingSafeEqualStrings } from "@/lib/crypto";
import type { Logger } from "@/lib/logger";

export interface CronSweepDeps {
  cronSecret: string | undefined;
  /** Opens the DB only after the caller is authenticated. */
  withSweepDeps: <T>(fn: (deps: SweepDeps) => Promise<T>) => Promise<T>;
  log: Logger;
}

export async function authorizeCron(request: Request, cronSecret: string | undefined, log: Logger): Promise<void> {
  const token = bearerToken(request.headers.get("authorization"));
  if (!cronSecret) {
    log.warn("cron: CRON_SECRET not configured; rejecting");
    throw new ApiError("unauthenticated");
  }
  if (!token || !(await timingSafeEqualStrings(token, cronSecret))) {
    log.warn("cron: rejected call with missing or wrong secret");
    throw new ApiError("unauthenticated");
  }
}

export async function cronSweepResponse(request: Request, deps: CronSweepDeps): Promise<Response> {
  await authorizeCron(request, deps.cronSecret, deps.log);
  const result = await deps.withSweepDeps((sweepDeps) => runSweep(sweepDeps));
  return Response.json(result, { status: 200 });
}
