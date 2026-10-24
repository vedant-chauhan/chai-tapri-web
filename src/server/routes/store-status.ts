import type { Clock } from "@/domain/clock";
import type { Db } from "@/server/db/types";
import { getStoreStatus, toOverrideDto, toStatusDto } from "../store/status";

/** GET /api/v1/store/status. Same answer for everyone, so a short shared cache is safe (API.md: max-age=10). */
export async function storeStatusResponse(db: Db, clock: Clock): Promise<Response> {
  const { input, status } = await getStoreStatus(db, clock);
  return Response.json(toStatusDto(status, input.now, input.settings.timezone), {
    headers: { "cache-control": "public, max-age=10" },
  });
}

/** Staff view: status plus the override in force. Never cached. */
export async function staffOrderingResponse(db: Db, clock: Clock): Promise<Response> {
  const { input, status } = await getStoreStatus(db, clock);
  const { timezone, tradingDayBoundary } = input.settings;
  return Response.json(
    { status: toStatusDto(status, input.now, timezone), override: toOverrideDto(status, timezone, tradingDayBoundary) },
    { headers: { "cache-control": "no-store" } },
  );
}
