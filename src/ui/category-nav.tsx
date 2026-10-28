"use client";

import { useEffect, useRef, useState } from "react";

const SCROLL_MS = 350;
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Scrolls to `y` over SCROLL_MS (instantly if the user prefers reduced motion). */
function glideTo(y: number, onDone: () => void) {
  const start = window.scrollY;
  const distance = y - start;
  if (prefersReducedMotion() || Math.abs(distance) < 2) {
    window.scrollTo(0, y);
    onDone();
    return;
  }
  const t0 = performance.now();
  const step = (now: number) => {
    const t = Math.min(1, (now - t0) / SCROLL_MS);
    window.scrollTo(0, start + distance * easeInOutCubic(t));
    if (t < 1) requestAnimationFrame(step);
    else onDone();
  };
  requestAnimationFrame(step);
}

/**
 * Sticky category bar for the menu (SITEMAP: "sticky category bar (scroll-spy)").
 * Links are plain anchors, so they work without JavaScript; with it, they glide and the current
 * category is marked (aria-current) and scrolled into view in the bar.
 */
export function CategoryNav({ categories }: { categories: Array<{ slug: string; name: string }> }) {
  const navRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState<string | null>(null);
  const gliding = useRef(false);

  // Scroll-spy: the last section whose top has passed under the sticky bars.
  useEffect(() => {
    const onScroll = () => {
      if (gliding.current) return;
      const offset = (navRef.current?.getBoundingClientRect().bottom ?? 0) + 16;
      let current: string | null = null;
      for (const { slug } of categories) {
        const el = document.getElementById(slug);
        if (el && el.getBoundingClientRect().top <= offset) current = slug;
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [categories]);

  // Keep the active link visible inside the horizontally scrolling bar.
  useEffect(() => {
    if (!active) return;
    navRef.current
      ?.querySelector<HTMLElement>(`a[href="#${active}"]`)
      ?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, [active]);

  const onClick = (event: React.MouseEvent<HTMLAnchorElement>, slug: string) => {
    const section = document.getElementById(slug);
    if (!section || event.metaKey || event.ctrlKey || event.shiftKey) return;
    event.preventDefault();
    // Where the bars will sit once stuck (header height + this bar), not where they are now:
    // before the first scroll the category bar is still lower down the page.
    const headerH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-h")) || 0;
    const stuckBottom = headerH + (navRef.current?.offsetHeight ?? 0);
    const y = section.getBoundingClientRect().top + window.scrollY - stuckBottom - 8;
    gliding.current = true;
    setActive(slug);
    glideTo(y, () => {
      gliding.current = false;
      history.replaceState(null, "", `#${slug}`);
      // Move keyboard/screen-reader focus to the section without another jump.
      section.querySelector<HTMLElement>("h2")?.focus({ preventScroll: true });
    });
  };

  return (
    <nav
      ref={navRef}
      aria-label="Menu categories"
      className="bg-ground border-ink/10 sticky top-[var(--header-h,3.5rem)] z-20 -mx-4 border-b px-4 sm:-mx-6 sm:px-6"
    >
      <ul className="flex [scrollbar-width:none] gap-1 overflow-x-auto py-2">
        {categories.map((c) => (
          <li key={c.slug} className="shrink-0">
            <a
              href={`#${c.slug}`}
              onClick={(e) => onClick(e, c.slug)}
              aria-current={active === c.slug ? "true" : undefined}
              className="aria-[current]:bg-ink aria-[current]:text-ground inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold transition-colors hover:underline aria-[current]:no-underline"
            >
              {c.name}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
