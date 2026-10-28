"use client";

import { useCart } from "./cart-provider";

/** Header cart button with the item count. */
export function CartButton() {
  const { priced, openCart, bumpKey } = useCart();
  const n = priced.itemCount;
  return (
    <button
      type="button"
      onClick={openCart}
      className="relative inline-flex min-h-12 items-center gap-2 px-3 font-semibold"
      aria-label={n ? `Your order, ${n} item${n === 1 ? "" : "s"}` : "Your order, empty"}
    >
      <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M4 7h16l-1.5 11.5a2 2 0 0 1-2 1.5h-9a2 2 0 0 1-2-1.5L4 7Z" />
        <path d="M9 7a3 3 0 0 1 6 0" />
      </svg>
      {n > 0 ? (
        <span
          key={bumpKey}
          className="bg-accent text-accent-ink animate-bump absolute top-1 right-0 inline-flex min-w-5 items-center justify-center rounded-full px-1 text-xs tabular-nums"
          aria-hidden="true"
        >
          {n}
        </span>
      ) : null}
    </button>
  );
}
