"use client";

import Link from "next/link";
import { BUSINESS } from "@/domain/business";
import { formatPrice } from "@/domain/menu";
import { TodayHours } from "../hours";
import { ShopMap } from "../shop-map";
import { StatusChip } from "../status-chip";
import { CartLines } from "./cart-lines";
import { useCart } from "./cart-provider";
import { cartStore } from "./cart-store";

const STEPS = ["Your order", "Pickup time", "Your details", "Payment"];

/** /checkout step 1: review the order and the pickup details. Payment arrives with slice 1. */
export function OrderReview() {
  const { priced } = useCart();

  return (
    <>
      <ol className="mt-6 flex flex-wrap gap-2 text-sm" aria-label="Checkout steps">
        {STEPS.map((step, i) => (
          <li
            key={step}
            aria-current={i === 0 ? "step" : undefined}
            className={`rounded-full px-3 py-1 font-semibold ${i === 0 ? "bg-ink text-paper" : "bg-surface text-ink-soft"}`}
          >
            {i + 1}. {step}
            {i > 0 ? <span className="font-normal"> · soon</span> : null}
          </li>
        ))}
      </ol>

      {priced.lines.length === 0 ? (
        <div className="tin tin-mustard mt-10 inline-flex flex-col items-start gap-3 p-8">
          <p className="font-sign text-4xl">Nothing here yet</p>
          <p>Your order is empty. Pick a chai and something to go with it.</p>
          <Link
            href="/menu"
            className="bg-accent text-accent-ink inline-flex min-h-12 items-center rounded-full px-6 font-bold"
          >
            Browse the menu
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-10 lg:grid-cols-12">
          <section aria-labelledby="order-lines" className="lg:col-span-7">
            <h2 id="order-lines" className="sr-only">
              Items
            </h2>
            <CartLines lines={priced.lines} withPhotos />
            <div className="mt-4 flex items-center justify-between">
              <Link href="/menu" className="inline-flex min-h-11 items-center font-semibold underline">
                Add more
              </Link>
              <button type="button" className="min-h-11 text-sm underline" onClick={() => cartStore.clear()}>
                Clear order
              </button>
            </div>
          </section>

          <aside aria-labelledby="pickup" className="flex flex-col gap-6 lg:col-span-5">
            <div className="tin tin-paper flex flex-col gap-4 p-6">
              <p className="flex items-baseline justify-between text-xl font-semibold">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatPrice(priced.subtotalCents)}</span>
              </p>
              <p className="text-ink-soft text-sm">
                {priced.itemCount} item{priced.itemCount === 1 ? "" : "s"} · prices as in the shop, confirmed at
                checkout.
              </p>
              <button
                type="button"
                aria-disabled="true"
                aria-describedby="pay-soon"
                className="bg-accent text-accent-ink min-h-12 cursor-not-allowed rounded-full px-6 text-lg font-bold opacity-60"
              >
                Pay online · coming soon
              </button>
              <p id="pay-soon" className="tin tin-mustard px-4 py-3 text-sm font-semibold">
                Online payment opens soon. For now, show this screen at the counter and we&apos;ll make it for you.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <h2 id="pickup" className="font-sign text-4xl">
                Pickup
              </h2>
              <StatusChip />
              <p className="font-semibold">{BUSINESS.address}</p>
              <p className="text-ink-soft">
                <TodayHours />
              </p>
              <ShopMap height="h-48" />
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
