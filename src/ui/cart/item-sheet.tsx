"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { CartError, lookup, MAX_EXTRA_QUANTITY, MAX_QUANTITY, priceSelection } from "@/domain/cart";
import { formatPrice } from "@/domain/menu";
import { photoFor } from "@/domain/menu-photos";
import { useCart } from "./cart-provider";
import { cartStore } from "./cart-store";
import { describeLine } from "./describe";
import { Stepper } from "./stepper";

/**
 * Item sheet (SLICE-01 §3): required choice (radio), extras (0–2 each), quantity, live price.
 * Native <dialog>: focus is trapped while open, Esc closes, focus returns to the "Add" button.
 */
export function ItemSheet({ slug, onClose }: { slug: string | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (slug && !dialog.open) dialog.showModal();
    if (!slug && dialog.open) dialog.close();
  }, [slug]);

  return (
    <dialog
      ref={ref}
      className="sheet overflow-y-auto overscroll-contain p-0"
      aria-labelledby="item-sheet-title"
      onClose={onClose}
    >
      {/* Keyed by item: the form starts fresh for every item. */}
      {slug ? <SheetBody key={slug} slug={slug} onClose={onClose} /> : null}
    </dialog>
  );
}

function SheetBody({ slug, onClose }: { slug: string; onClose: () => void }) {
  const { announceAdded } = useCart();
  const found = lookup(slug);
  const [choice, setChoice] = useState<string | null>(null);
  const [extras, setExtras] = useState<Record<string, number>>({});
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const preview = useMemo(() => {
    try {
      return priceSelection({ itemSlug: slug, choice, extras, quantity });
    } catch {
      return null;
    }
  }, [slug, choice, extras, quantity]);

  if (!found) return null;
  const { item, category } = found;
  const photo = photoFor(item);
  const needsChoice = item.price.kind === "choice" && !choice;

  const add = () => {
    try {
      const chosenExtras = Object.fromEntries(Object.entries(extras).filter(([, q]) => q > 0));
      const selection = { itemSlug: item.slug, choice, extras: chosenExtras, quantity };
      const line = priceSelection(selection);
      cartStore.add(selection);
      const detail = describeLine(line);
      announceAdded(`Added ${quantity} × ${item.name}${detail ? ` (${detail})` : ""} to your order.`);
      onClose();
    } catch (e) {
      setError(e instanceof CartError ? e.message : "Couldn't add this item. Please try again.");
    }
  };

  return (
    <form method="dialog" className="flex flex-col">
      {photo ? (
        <div className="bg-surface relative aspect-[16/9] max-h-56 w-full">
          <Image
            src={photo.src}
            alt={`${item.name}, as served at Chai Tapri`}
            fill
            sizes="(min-width: 640px) 480px, 100vw"
            className="object-cover"
          />
        </div>
      ) : null}
      <div className="flex flex-col gap-5 p-5">
        <div className="flex items-start justify-between gap-4">
          <h2 id="item-sheet-title" className="font-display text-xl font-extrabold tracking-tight">
            {item.name}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="-mt-1 -mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-2xl"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {item.price.kind === "choice" ? (
          <fieldset>
            <legend className="font-semibold">
              {item.price.group} <span className="text-ink-soft text-sm font-normal">(required)</span>
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {item.price.choices.map((c) => (
                <label
                  key={c.label}
                  className="border-ink/20 has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-paper has-[:focus-visible]:outline-accent inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border-2 px-4 has-[:focus-visible]:outline-3"
                >
                  <input
                    type="radio"
                    name="choice"
                    value={c.label}
                    checked={choice === c.label}
                    onChange={() => setChoice(c.label)}
                    className="sr-only"
                  />
                  <span className="font-semibold">{c.label}</span>
                  <span className="tabular-nums">{formatPrice(c.priceCents)}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}

        {category.extras.length > 0 ? (
          <fieldset>
            <legend className="font-semibold">
              Extras{" "}
              <span className="text-ink-soft text-sm font-normal">(optional, up to {MAX_EXTRA_QUANTITY} each)</span>
            </legend>
            <ul className="mt-2 flex flex-col gap-2">
              {category.extras.map((e) => (
                <li key={e.name} className="flex items-center justify-between gap-4">
                  <span>
                    {e.name} <span className="text-ink-soft tabular-nums">+{formatPrice(e.priceCents)}</span>
                  </span>
                  <Stepper
                    size="sm"
                    label={e.name}
                    value={extras[e.name] ?? 0}
                    min={0}
                    max={MAX_EXTRA_QUANTITY}
                    onChange={(n) => setExtras((prev) => ({ ...prev, [e.name]: n }))}
                  />
                </li>
              ))}
            </ul>
          </fieldset>
        ) : null}

        <div className="flex items-center justify-between gap-4">
          <span className="font-semibold">Quantity</span>
          <Stepper label={item.name} value={quantity} min={1} max={MAX_QUANTITY} onChange={setQuantity} />
        </div>

        {error ? (
          <p role="alert" className="text-danger font-semibold">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          onClick={add}
          disabled={needsChoice}
          aria-describedby={needsChoice ? "item-sheet-hint" : undefined}
          className="bg-accent text-accent-ink min-h-12 rounded-full px-6 text-lg font-bold disabled:opacity-50"
        >
          {needsChoice ? "Add to order" : `Add to order · ${formatPrice(preview?.lineCents ?? 0)}`}
        </button>
        {needsChoice && item.price.kind === "choice" ? (
          <p id="item-sheet-hint" className="text-ink-soft -mt-3 text-center text-sm">
            Choose a {item.price.group.toLowerCase()} first.
          </p>
        ) : null}
      </div>
    </form>
  );
}
