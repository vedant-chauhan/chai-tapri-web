"use client";

import { useEffect, useState } from "react";

export type Remote<T> = { state: "loading" } | { state: "ready"; data: T } | { state: "error" };

/**
 * Fetches JSON from our own API, refreshing every `refreshMs` and when the tab regains focus.
 * Keeps the last good data if a refresh fails (a stale-but-true badge beats a flicker).
 */
export function useJson<T>(url: string, refreshMs: number): Remote<T> {
  const [remote, setRemote] = useState<Remote<T>>({ state: "loading" });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(url, { headers: { accept: "application/json" } });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as T;
        if (!cancelled) setRemote({ state: "ready", data });
      } catch {
        if (!cancelled) setRemote((prev) => (prev.state === "ready" ? prev : { state: "error" }));
      }
    };
    void load();
    const timer = setInterval(load, refreshMs);
    const onVisible = () => document.visibilityState === "visible" && void load();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [url, refreshMs]);

  return remote;
}
