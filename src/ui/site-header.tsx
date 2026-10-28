import Link from "next/link";
import { CartButton } from "./cart/cart-button";
import { HeaderHeight } from "./header-height";
import { StatusChip } from "./status-chip";

const NAV = [
  { href: "/menu", label: "Menu", wide: false },
  { href: "/visit", label: "Visit", wide: false },
  // Phones keep the header to one row; Franchise is in the footer there.
  { href: "/franchise", label: "Franchise", wide: true },
] as const;

/** Sticky on every page: brand, main links and the live status, on the lightest cream. */
export function SiteHeader() {
  return (
    <>
      <a
        href="#main"
        className="bg-ink text-ground sr-only rounded px-3 py-2 focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50"
      >
        Skip to content
      </a>
      <header id="site-header" className="bg-header border-brand sticky top-0 z-30 border-b-[3px]">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-2 px-3 sm:gap-x-6 sm:px-6">
          <Link href="/" className="inline-flex min-h-14 shrink-0 items-center gap-2 py-1" aria-label="Chai Tapri home">
            {/* Logo files from `pnpm brand` (sized for 4× screens); plain <img>: nothing to optimise. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-mark.webp" alt="" width={47} height={48} className="size-10 sm:size-12" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-wordmark.webp" alt="" width={128} height={28} className="h-5 w-auto sm:h-7" />
          </Link>
          <StatusChip className="order-last w-full pb-2 sm:order-none sm:w-auto sm:pb-0" />
          <nav aria-label="Main" className="-mr-2 ml-auto flex items-center sm:mr-0">
            <ul className="flex gap-1">
              {NAV.map((item) => (
                <li key={item.href} className={item.wide ? "hidden md:block" : undefined}>
                  <Link
                    href={item.href}
                    className="inline-flex min-h-12 items-center px-3 font-semibold hover:underline"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <CartButton />
          </nav>
        </div>
      </header>
      <HeaderHeight targetId="site-header" />
    </>
  );
}
