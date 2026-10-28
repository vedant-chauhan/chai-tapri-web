"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { formatPrice } from "@/domain/menu";
import { useCart } from "./cart-provider";
import { CartLines } from "./cart-lines";
import { cartStore } from "./cart-store";

/**
 * "Your order" drawer: a quick look, then "Review order" → /checkout. Totals are a preview from the
 * menu data; the server reprices at checkout.
 */
export function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const { priced } = useCart();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog ref={ref} className="drawer p-0" aria-labelledby="cart-title" onClose={onClose}>
      <div className="flex h-full flex-col">
        <div className="border-ink/10 flex items-center justify-between border-b px-5 py-3">
          <h2 id="cart-title" className="font-display text-lg font-extrabold tracking-tight">
            Your order
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="-mr-2 inline-flex size-11 items-center justify-center rounded-full text-2xl"
            aria-label="Close your order"
          >
            ×
          </button>
        </div>

        {priced.lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-start gap-3 p-5">
            <p className="text-lg">Your order is empty.</p>
            <Link href="/menu" onClick={onClose} className="font-semibold underline">
              Browse the menu
            </Link>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5">
              <CartLines lines={priced.lines} />
            </div>
            <div className="border-ink/10 flex flex-col gap-3 border-t p-5">
              <p className="flex items-baseline justify-between text-lg font-semibold">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatPrice(priced.subtotalCents)}</span>
              </p>
              <Link
                href="/checkout"
                onClick={onClose}
                className="bg-accent text-accent-ink inline-flex min-h-12 items-center justify-center rounded-full px-6 text-lg font-bold hover:brightness-110"
              >
                Review order
              </Link>
              <p className="text-ink-soft text-sm">
                Online payment opens soon. Until then, show your order at the counter: same prices as in the shop.
              </p>
              <button type="button" className="self-start text-sm underline" onClick={() => cartStore.clear()}>
                Clear order
              </button>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}
