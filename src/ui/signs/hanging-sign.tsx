"use client";

import type { StoreStatusDto } from "../store-types";
import { useJson } from "../use-json";

/**
 * The shop-door sign: hangs from a nail on two strings and swings once on load.
 * Reads the live status (same endpoint as the header chip). Decorative duplicate of the
 * header status, so hidden from screen readers.
 */
export function HangingSign({ className = "" }: { className?: string }) {
  const remote = useJson<StoreStatusDto>("/api/v1/store/status", 60_000);
  let big = "CHAI";
  let small = "Northbridge";
  let tone = "tin-paper";
  if (remote.state === "ready") {
    const s = remote.data;
    if (s.open) {
      big = "OPEN";
      small = `till ${s.orderingUntilLabel}`;
      tone = "tin-teal";
    } else if (s.reason === "paused") {
      big = "BACK SOON";
      small = s.nextOpenLabel ? `from ${s.nextOpenLabel}` : "short break";
      tone = "tin-mustard";
    } else {
      big = "CLOSED";
      small = s.nextOpenLabel ? `opens ${s.nextOpenLabel}` : "see you soon";
      tone = "tin-red";
    }
  }
  return (
    <div className={`flex flex-col items-center ${className}`} aria-hidden="true">
      <svg viewBox="0 0 160 46" className="text-rust w-40" fill="none">
        <circle cx="80" cy="6" r="5" fill="currentColor" />
        <path d="M80 8 18 44M80 8l62 36" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      <div
        className={`tin ${tone} animate-swing -mt-1 origin-top px-7 pt-5 pb-4 text-center`}
        style={{ transformOrigin: "50% -40px" }}
      >
        <p className="font-sign text-5xl">{big}</p>
        <p className="mt-1 text-sm font-semibold">{small}</p>
      </div>
    </div>
  );
}
