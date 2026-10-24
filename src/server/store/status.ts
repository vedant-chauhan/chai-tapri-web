/**
 * Store status for customers (API.md `GET /api/v1/store/status`) and staff screens.
 * Times are ISO 8601 UTC; labels are computed server-side in the store's time zone.
 */
import { computeStoreStatus, effectiveOverrideEnd, type ClosedReason, type StoreStatus } from "@/domain/availability";
import { nextOpenLabel, timeLabel, type Clock } from "@/domain/clock";
import type { Db } from "@/server/db/types";
import { loadAvailabilityInput } from "./schedule-repository";

export interface StoreStatusDto {
  open: boolean;
  reason: ClosedReason | null;
  orderingUntil: string | null;
  orderingUntilLabel: string | null;
  nextOpen: string | null;
  nextOpenLabel: string | null;
  notice: string | null;
  prepMinutes: number;
}

export async function getStoreStatus(db: Db, clock: Clock) {
  const input = await loadAvailabilityInput(db, clock.now());
  return { input, status: computeStoreStatus(input) };
}

export function toStatusDto(status: StoreStatus, now: Date, timezone: string): StoreStatusDto {
  return {
    open: status.open,
    reason: status.reason,
    orderingUntil: status.orderingUntil?.toISOString() ?? null,
    orderingUntilLabel: status.orderingUntil ? timeLabel(status.orderingUntil, timezone) : null,
    nextOpen: status.nextOpen?.toISOString() ?? null,
    nextOpenLabel: status.nextOpen ? nextOpenLabel(status.nextOpen, now, timezone) : null,
    notice: status.notice,
    prepMinutes: status.prepMinutes,
  };
}

/** The active override as staff see it. `endsAt` is the effective end (see effectiveOverrideEnd). */
export function toOverrideDto(status: StoreStatus, timezone: string, tradingDayBoundary: string) {
  const o = status.activeOverride;
  if (!o) return null;
  const end = effectiveOverrideEnd(o, { timezone, tradingDayBoundary });
  return {
    id: o.id,
    mode: o.mode,
    startsAt: o.startsAt.toISOString(),
    endsAt: end.toISOString(),
    endsAtLabel: timeLabel(end, timezone),
    untilReopened: o.endsAt === null,
  };
}
