"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { BUSINESS } from "@/domain/business";
import { InstagramIcon } from "./icons";

export interface NavItem {
  href: string;
  label: string;
}

/**
 * Phones: a "More" disclosure for the links that don't fit the one-row header (SITEMAP: the menu
 * icon opens Story / Visit / Instagram; ordering itself stays one tap away, never hidden here).
 * Closes on navigation, Escape, or a tap outside.
 */
export function MobileMenu({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const panelId = useId();
  const root = useRef<HTMLDivElement>(null);
  const [lastPath, setLastPath] = useState(pathname);

  // Close when the route changes (state adjusted during render, not in an effect).
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onClick = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  }, [open]);

  return (
    <div ref={root} className="md:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex min-h-12 items-center gap-1.5 px-2 font-semibold"
      >
        <svg
          viewBox="0 0 24 24"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          aria-hidden="true"
        >
          {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
        More
      </button>
      <div
        id={panelId}
        hidden={!open}
        className="bg-header border-brand absolute inset-x-0 top-full border-b-[3px] px-4 pt-2 pb-4 shadow-[0_12px_20px_-14px_rgb(43_27_18/0.5)]"
      >
        <ul className="flex flex-col">
          {items.map((item) => (
            <li key={item.href} className="border-ink/10 border-b last:border-b-0">
              <Link
                href={item.href}
                aria-current={pathname === item.href ? "page" : undefined}
                className="aria-[current=page]:text-accent flex min-h-12 items-center text-lg font-semibold"
              >
                {item.label}
              </Link>
            </li>
          ))}
          <li>
            <a href={BUSINESS.instagram.url} className="flex min-h-12 items-center gap-2 text-lg font-semibold">
              <InstagramIcon className="size-5" />
              Instagram {BUSINESS.instagram.handle}
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}
