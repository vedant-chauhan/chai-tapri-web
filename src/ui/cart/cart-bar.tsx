"use client";

import { usePathname } from "next/navigation";
import { formatPrice } from "@/domain/menu";
import { useCart } from "./cart-provider";

/** Sticky bottom bar once something is in the order (SITEMAP: "cart bottom bar on mobile"). */
export function CartBar() {
  const { priced, openCart, bumpKey } = useCart();
  const pathname = usePathname();
  // Not on the order page itself: the order is already on screen there.
  if (priced.itemCount === 0 || pathname === "/checkout") return null;
  return (
    <>
      {/* Room under the footer so the floating bar never covers content. */}
      <div aria-hidden="true" className="bg-band h-24" />
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-4">
        <button
          type="button"
          onClick={openCart}
          className="tin tin-ink pointer-events-auto flex min-h-14 w-full max-w-md items-center justify-between gap-4 px-6 font-semibold"
        >
          <span className="flex items-center gap-3">
            <span
              key={bumpKey}
              className="bg-mustard text-ink animate-bump inline-flex size-8 items-center justify-center rounded-full tabular-nums"
            >
              {priced.itemCount}
            </span>
            View your order
          </span>
          <span className="tabular-nums">{formatPrice(priced.subtotalCents)}</span>
        </button>
      </div>
    </>
  );
}
