/** Wiring for staff route handlers: request id + error shape, request-scoped auth/DB, capability check. */
import "server-only";
import { systemClock, type Clock } from "@/domain/clock";
import type { Logger } from "@/lib/logger";
import type { Capability } from "@/server/auth/capabilities";
import { requireCapability } from "@/server/auth/require-staff";
import { withAuth } from "@/server/auth/runtime";
import type { Db } from "@/server/db/types";
import type { StaffRole } from "@/server/db/schema";
import { handleRequest } from "../http";

export interface StaffContext {
  db: Db;
  clock: Clock;
  log: Logger;
  actor: { userId: string; role: StaffRole };
}

export function staffRoute(
  request: Request,
  capability: Capability,
  handler: (ctx: StaffContext) => Promise<Response>,
): Promise<Response> {
  return handleRequest(request, ({ log }) =>
    withAuth(async ({ auth, db }) => {
      const staff = await requireCapability(auth, db, request.headers, capability);
      return handler({ db, clock: systemClock, log, actor: { userId: staff.userId, role: staff.role } });
    }),
  );
}
