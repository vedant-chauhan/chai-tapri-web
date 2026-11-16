"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";
import { glideTo } from "./glide";

/**
 * The header logo. Elsewhere it navigates home as usual; on the home page a link to the current URL
 * does nothing in Next.js, so it glides back to the top instead (and drops any #hash).
 */
export function HomeLink(props: Omit<ComponentProps<typeof Link>, "href">) {
  const pathname = usePathname();
  return (
    <Link
      {...props}
      href="/"
      onClick={(e) => {
        props.onClick?.(e);
        // Leave new-tab/window clicks to the browser.
        if (
          pathname !== "/" ||
          e.defaultPrevented ||
          e.button !== 0 ||
          e.metaKey ||
          e.ctrlKey ||
          e.shiftKey ||
          e.altKey
        )
          return;
        e.preventDefault();
        if (window.location.hash) window.history.replaceState(window.history.state, "", "/");
        glideTo(0);
      }}
    />
  );
}
