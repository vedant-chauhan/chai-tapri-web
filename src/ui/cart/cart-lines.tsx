"use client";

import { MAX_QUANTITY, type PricedLine } from "@/domain/cart";
import { formatPrice } from "@/domain/menu";
import { cartStore } from "./cart-store";
import { describeLine } from "./describe";
import { MenuThumb } from "../menu-thumb";
import { Stepper } from "./stepper";

/** The order's lines with quantity controls. Shared by the cart drawer and the /checkout page. */
export function CartLines({ lines, withPhotos = false }: { lines: PricedLine[]; withPhotos?: boolean }) {
  return (
    <ul>
      {lines.map((line) => {
        const detail = describeLine(line);
        return (
          <li key={line.key} className="border-ink/10 flex gap-4 border-b py-4">
            {withPhotos ? <MenuThumb item={line.item} className="size-16 sm:size-20" /> : null}
            <div className="flex flex-1 flex-col gap-2">
              <div className="flex items-baseline justify-between gap-4">
                <span className="font-semibold">{line.item.name}</span>
                <span className="tabular-nums">{formatPrice(line.lineCents)}</span>
              </div>
              {detail ? <span className="text-ink-soft text-sm">{detail}</span> : null}
              <div className="flex items-center justify-between">
                <Stepper
                  size="sm"
                  label={line.item.name}
                  value={line.selection.quantity}
                  min={0}
                  max={MAX_QUANTITY}
                  onChange={(n) => cartStore.setQuantity(line.key, n)}
                />
                <button
                  type="button"
                  className="min-h-11 px-2 text-sm underline"
                  onClick={() => cartStore.setQuantity(line.key, 0)}
                >
                  Remove<span className="sr-only"> {line.item.name}</span>
                </button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
