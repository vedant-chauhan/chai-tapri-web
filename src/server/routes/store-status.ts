import { computeStoreStatus, type AvailabilityInput } from "@/domain/availability";
import type { Clock } from "@/domain/clock";
import type { Db } from "@/server/db/types";
import { toHoursDto } from "../store/hours";
import { loadAvailabilityInput } from "../store/schedule-repository";
import type { ScheduleSource } from "../store/schedule-source";
import { getStoreStatus, toOverrideDto, toStatusDto } from "../store/status";

const sourceHeader = (source: ScheduleSource): Record<string, string> =>
  source === "database" ? {} : { "x-schedule-source": source };

/** GET /api/v1/store/status. Same answer for everyone, so a short shared cache is safe (API.md: max-age=10). */
export function statusResponseFromInput(input: AvailabilityInput, source: ScheduleSource = "database"): Response {
  const status = computeStoreStatus(input);
  return Response.json(toStatusDto(status, input.now, input.settings.timezone), {
    headers: { "cache-control": "public, max-age=10", ...sourceHeader(source) },
  });
}

export async function storeStatusResponse(db: Db, clock: Clock): Promise<Response> {
  return statusResponseFromInput(await loadAvailabilityInput(db, clock.now()));
}

/** GET /api/v1/store/hours (additive to API.md v1). Hours change rarely: 5 min cache. */
export function hoursResponseFromInput(input: AvailabilityInput, source: ScheduleSource = "database"): Response {
  return Response.json(toHoursDto(input), {
    headers: { "cache-control": "public, max-age=300", ...sourceHeader(source) },
  });
}

export async function storeHoursResponse(db: Db, clock: Clock): Promise<Response> {
  return hoursResponseFromInput(await loadAvailabilityInput(db, clock.now()));
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
