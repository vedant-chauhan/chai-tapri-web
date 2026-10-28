"use client";

import { useEffect } from "react";

/**
 * Publishes the sticky header's height as `--header-h` on <html>, so other sticky bars
 * (the menu's category nav) sit right under it and anchors land below it. The header wraps to
 * two lines on phones, so it's measured, not hard-coded.
 */
export function HeaderHeight({ targetId }: { targetId: string }) {
  useEffect(() => {
    const el = document.getElementById(targetId);
    if (!el) return;
    const set = () => document.documentElement.style.setProperty("--header-h", `${el.offsetHeight}px`);
    set();
    const observer = new ResizeObserver(set);
    observer.observe(el);
    return () => observer.disconnect();
  }, [targetId]);
  return null;
}
