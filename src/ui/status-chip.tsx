"use client";

import type { StoreStatusDto } from "./store-types";
import { useJson } from "./use-json";

/**
 * Live online-ordering status (SITEMAP header chip, BR-AV-12: fetched live, never baked into
 * cached pages). Colour is never the only signal: every state has words.
 */
export function statusText(remote: ReturnType<typeof useJson<StoreStatusDto>>): { tone: Tone; text: string } {
  if (remote.state === "loading") return { tone: "muted", text: "Checking opening hours…" };
  if (remote.state === "error") return { tone: "muted", text: "Can't confirm opening hours right now" };
  const s = remote.data;
  if (s.open) return { tone: "open", text: `Open · online orders until ${s.orderingUntilLabel}` };
  const next = s.nextOpenLabel ? ` · opens ${s.nextOpenLabel}` : "";
  if (s.reason === "paused") return { tone: "paused", text: `Online orders paused by the shop${next}` };
  if (s.reason === "unavailable") return { tone: "closed", text: "Online ordering is unavailable right now" };
  return { tone: "closed", text: `Closed${next}` };
}

type Tone = "open" | "closed" | "paused" | "muted";

const DOT: Record<Tone, string> = {
  open: "bg-success",
  closed: "bg-ink/40",
  paused: "bg-warning",
  muted: "bg-ink/20",
};

export function StatusChip({ className = "" }: { className?: string }) {
  const remote = useJson<StoreStatusDto>("/api/v1/store/status", 60_000);
  const { tone, text } = statusText(remote);
  const notice = remote.state === "ready" ? remote.data.notice : null;
  return (
    <p className={`flex items-center gap-2 text-sm ${className}`} aria-live="polite" data-tone={tone}>
      <span aria-hidden="true" className={`size-2.5 shrink-0 rounded-full ${DOT[tone]}`} />
      <span>
        {text}
        {notice ? <span className="block">{notice}</span> : null}
      </span>
    </p>
  );
}
