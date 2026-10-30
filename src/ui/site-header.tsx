import Link from "next/link";
import { CartButton } from "./cart/cart-button";
import { HeaderHeight } from "./header-height";
import { MobileMenu } from "./mobile-menu";
import { StatusChip } from "./status-chip";

/** All links, shown in a row from md. On phones only Menu stays in the row; the rest go under "More". */
const NAV = [
  { href: "/menu", label: "Menu", always: true },
  { href: "/visit", label: "Visit", always: false },
  { href: "/merch", label: "Merch", always: false },
  { href: "/franchise", label: "Franchise", always: false },
];

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
        {/* relative: anchors the phone "More" panel to the header's full width */}
        <div className="relative mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-2 px-3 sm:gap-x-6 sm:px-6">
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
                <li key={item.href} className={item.always ? undefined : "hidden md:block"}>
                  <Link
                    href={item.href}
                    className="inline-flex min-h-12 items-center px-2 font-semibold hover:underline sm:px-3"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <MobileMenu items={NAV.filter((i) => !i.always)} />
            <CartButton />
          </nav>
        </div>
      </header>
      <HeaderHeight targetId="site-header" />
    </>
  );
}
