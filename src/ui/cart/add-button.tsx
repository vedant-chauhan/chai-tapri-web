"use client";

import { needsOptions, priceSelection } from "@/domain/cart";
import { findItem } from "@/domain/menu";
import { useCart } from "./cart-provider";
import { cartStore } from "./cart-store";

/**
 * "Add" on a menu row. Items with a size/style or extras open the item sheet; plain items
 * (e.g. Water, Bun Maska) go straight into the order.
 */
export function AddButton({ slug, className = "" }: { slug: string; className?: string }) {
  const { openItem, announceAdded } = useCart();
  const item = findItem(slug);
  if (!item) return null;

  const onClick = () => {
    if (needsOptions(slug)) return openItem(slug);
    const selection = { itemSlug: slug, choice: null, extras: {}, quantity: 1 };
    priceSelection(selection);
    cartStore.add(selection);
    announceAdded(`Added ${item.name} to your order.`);
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Add ${item.name}`}
      aria-haspopup={needsOptions(slug) ? "dialog" : undefined}
      className={`bg-accent text-accent-ink inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full px-4 font-bold hover:brightness-110 active:scale-95 ${className}`}
    >
      <span aria-hidden="true" className="text-lg leading-none">
        +
      </span>
      Add
    </button>
  );
}
