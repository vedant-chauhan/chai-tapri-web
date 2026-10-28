/**
 * Cart rules (SLICE-01 §4.4 "Pricing rules", SECURITY.md "Tampered prices"). Pure functions over
 * the menu data, used by the browser cart now and by the server's repricing at checkout later.
 *
 * The cart stores only *selections* (item, choice, extras, quantity), never prices: every total is
 * recomputed from MENU, so a stale or edited cart can't change what anyone pays. Checkout will
 * reprice on the server regardless (API.md `POST /cart/price`).
 */
import { MENU, type MenuCategory, type MenuItem } from "./menu";

export const MAX_QUANTITY = 20;
export const MAX_LINES = 30;
/** Each extra 0–2 times [Assumption, SLICE-01 §4.3]. */
export const MAX_EXTRA_QUANTITY = 2;

export interface CartSelection {
  itemSlug: string;
  /** Required choice label (e.g. "Regular", "Grilled"); null for single-price items. */
  choice: string | null;
  /** Extra name → quantity (1–2). Omit extras that aren't chosen. */
  extras: Record<string, number>;
  quantity: number;
}

export interface PricedLine {
  key: string;
  selection: CartSelection;
  item: MenuItem;
  category: MenuCategory;
  choiceLabel: string | null;
  extras: Array<{ name: string; quantity: number; priceCents: number }>;
  unitCents: number;
  lineCents: number;
}

export class CartError extends Error {
  constructor(
    readonly code: "unknown_item" | "choice_required" | "invalid_choice" | "invalid_extra" | "quantity_out_of_range",
    message: string,
  ) {
    super(message);
    this.name = "CartError";
  }
}

const INDEX = new Map(MENU.flatMap((category) => category.items.map((item) => [item.slug, { item, category }])));

export function lookup(slug: string): { item: MenuItem; category: MenuCategory } | undefined {
  return INDEX.get(slug);
}

/** Does adding this item need the item sheet (a required choice, or extras to offer)? */
export function needsOptions(slug: string): boolean {
  const found = lookup(slug);
  return !!found && (found.item.price.kind === "choice" || found.category.extras.length > 0);
}

/** Same item + choice + extras = same line (quantities merge). */
export function lineKey(s: CartSelection): string {
  const extras = Object.entries(s.extras)
    .filter(([, q]) => q > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([n, q]) => `${n}x${q}`)
    .join(",");
  return `${s.itemSlug}|${s.choice ?? ""}|${extras}`;
}

/** Validates a selection against the menu and prices it. Throws CartError if it isn't orderable. */
export function priceSelection(s: CartSelection): PricedLine {
  const found = lookup(s.itemSlug);
  if (!found) throw new CartError("unknown_item", "This item isn't on the menu any more.");
  const { item, category } = found;

  let baseCents: number;
  let choiceLabel: string | null = null;
  if (item.price.kind === "choice") {
    if (!s.choice) throw new CartError("choice_required", `Choose a ${item.price.group.toLowerCase()}.`);
    const choice = item.price.choices.find((c) => c.label === s.choice);
    if (!choice) throw new CartError("invalid_choice", `That ${item.price.group.toLowerCase()} isn't available.`);
    baseCents = choice.priceCents;
    choiceLabel = choice.label;
  } else {
    if (s.choice) throw new CartError("invalid_choice", "This item has no options.");
    baseCents = item.price.cents;
  }

  const extras: PricedLine["extras"] = [];
  for (const [name, quantity] of Object.entries(s.extras)) {
    if (quantity === 0) continue;
    const extra = category.extras.find((e) => e.name === name);
    if (!extra) throw new CartError("invalid_extra", `${name} isn't available for this item.`);
    if (!Number.isInteger(quantity) || quantity < 0 || quantity > MAX_EXTRA_QUANTITY) {
      throw new CartError("invalid_extra", `Up to ${MAX_EXTRA_QUANTITY} of each extra.`);
    }
    extras.push({ name, quantity, priceCents: extra.priceCents });
  }
  extras.sort((a, b) => a.name.localeCompare(b.name));

  if (!Number.isInteger(s.quantity) || s.quantity < 1 || s.quantity > MAX_QUANTITY) {
    throw new CartError("quantity_out_of_range", `Quantity must be between 1 and ${MAX_QUANTITY}.`);
  }

  const unitCents = baseCents + extras.reduce((sum, e) => sum + e.priceCents * e.quantity, 0);
  return {
    key: lineKey(s),
    selection: s,
    item,
    category,
    choiceLabel,
    extras,
    unitCents,
    lineCents: unitCents * s.quantity,
  };
}

/** Adds a selection, merging with an identical line (quantity capped at MAX_QUANTITY). */
export function addSelection(cart: CartSelection[], s: CartSelection): CartSelection[] {
  priceSelection(s); // reject invalid selections before they reach the cart
  const key = lineKey(s);
  const existing = cart.find((c) => lineKey(c) === key);
  if (existing) {
    return cart.map((c) =>
      lineKey(c) === key ? { ...c, quantity: Math.min(MAX_QUANTITY, c.quantity + s.quantity) } : c,
    );
  }
  if (cart.length >= MAX_LINES) {
    throw new CartError("quantity_out_of_range", `An order can have up to ${MAX_LINES} different items.`);
  }
  return [...cart, s];
}

export function setQuantity(cart: CartSelection[], key: string, quantity: number): CartSelection[] {
  if (quantity <= 0) return cart.filter((c) => lineKey(c) !== key);
  return cart.map((c) => (lineKey(c) === key ? { ...c, quantity: Math.min(MAX_QUANTITY, quantity) } : c));
}

/**
 * Prices a stored cart, silently dropping lines that are no longer valid (e.g. an item removed from
 * the menu since the cart was saved). Returns the valid lines and the subtotal.
 */
export function priceCart(cart: CartSelection[]): { lines: PricedLine[]; subtotalCents: number; itemCount: number } {
  const lines: PricedLine[] = [];
  for (const s of cart) {
    try {
      lines.push(priceSelection(s));
    } catch {
      // Dropped: the server would reject it at checkout anyway.
    }
  }
  return {
    lines,
    subtotalCents: lines.reduce((sum, l) => sum + l.lineCents, 0),
    itemCount: lines.reduce((sum, l) => sum + l.selection.quantity, 0),
  };
}

/** Parses untrusted stored data (localStorage) into selections; anything malformed is dropped. */
export function parseStoredCart(raw: unknown): CartSelection[] {
  if (!Array.isArray(raw)) return [];
  const out: CartSelection[] = [];
  for (const r of raw.slice(0, MAX_LINES)) {
    if (!r || typeof r !== "object") continue;
    const { itemSlug, choice, extras, quantity } = r as Record<string, unknown>;
    if (typeof itemSlug !== "string" || typeof quantity !== "number") continue;
    const cleanExtras: Record<string, number> = {};
    if (extras && typeof extras === "object") {
      for (const [k, v] of Object.entries(extras)) if (typeof v === "number") cleanExtras[k] = v;
    }
    const s = { itemSlug, choice: typeof choice === "string" ? choice : null, extras: cleanExtras, quantity };
    try {
      priceSelection(s);
      out.push(s);
    } catch {
      // drop
    }
  }
  return out;
}
