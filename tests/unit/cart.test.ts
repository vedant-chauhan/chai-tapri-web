import { describe, expect, it } from "vitest";
import {
  addSelection,
  CartError,
  lineKey,
  MAX_LINES,
  needsOptions,
  parseStoredCart,
  priceCart,
  priceSelection,
  setQuantity,
  type CartSelection,
} from "@/domain/cart";

const sel = (itemSlug: string, extra: Partial<CartSelection> = {}): CartSelection => ({
  itemSlug,
  choice: null,
  extras: {},
  quantity: 1,
  ...extra,
});

describe("priceSelection (SLICE-01 §4.4)", () => {
  it("Regular Masala Chai = $5.49; Cutting = $4.49", () => {
    expect(priceSelection(sel("masala-chai", { choice: "Regular" })).unitCents).toBe(549);
    expect(priceSelection(sel("masala-chai", { choice: "Cutting" })).unitCents).toBe(449);
  });

  it("line = (base + extras) × qty: Classic Vada Pav + 2 × extra cheese, × 3", () => {
    const line = priceSelection(sel("classic-vada-pav", { extras: { "Extra cheese": 2 }, quantity: 3 }));
    expect(line.unitCents).toBe(749 + 2 * 200);
    expect(line.lineCents).toBe((749 + 400) * 3);
  });

  it("Grilled Veg Sandwich with chutney", () => {
    expect(priceSelection(sel("veg-sandwich", { choice: "Grilled", extras: { "Extra chutney": 1 } })).unitCents).toBe(
      990 + 150,
    );
  });

  it.each([
    ["missing required size", sel("masala-chai"), "choice_required"],
    ["unknown size", sel("masala-chai", { choice: "Large" }), "invalid_choice"],
    ["Bournvita has no Cutting", sel("bournvita", { choice: "Cutting" }), "invalid_choice"],
    ["choice on a single-price item", sel("water", { choice: "Regular" }), "invalid_choice"],
    [
      "extra not offered for chai",
      sel("masala-chai", { choice: "Regular", extras: { "Extra cheese": 1 } }),
      "invalid_extra",
    ],
    ["cheese not offered on samosa", sel("single-samosa", { extras: { "Extra cheese": 1 } }), "invalid_extra"],
    ["3 × an extra", sel("classic-vada-pav", { extras: { "Extra cheese": 3 } }), "invalid_extra"],
    ["qty 0", sel("water", { quantity: 0 }), "quantity_out_of_range"],
    ["qty 21", sel("water", { quantity: 21 }), "quantity_out_of_range"],
    ["fractional qty", sel("water", { quantity: 1.5 }), "quantity_out_of_range"],
    ["unknown item", sel("lobster"), "unknown_item"],
  ])("rejects %s", (_label, s, code) => {
    expect(() => priceSelection(s)).toThrow(CartError);
    try {
      priceSelection(s);
    } catch (e) {
      expect((e as CartError).code).toBe(code);
    }
  });
});

describe("cart operations", () => {
  it("merges identical lines and caps quantity at 20", () => {
    let cart = addSelection([], sel("water", { quantity: 15 }));
    cart = addSelection(cart, sel("water", { quantity: 10 }));
    expect(cart).toHaveLength(1);
    expect(cart[0].quantity).toBe(20);
  });

  it("different choices or extras are different lines; extras order doesn't matter", () => {
    const a = sel("classic-vada-pav", { extras: { "Extra cheese": 1, "Extra chutney": 1 } });
    const b = sel("classic-vada-pav", { extras: { "Extra chutney": 1, "Extra cheese": 1 } });
    expect(lineKey(a)).toBe(lineKey(b));
    const cart = addSelection(
      addSelection([], sel("masala-chai", { choice: "Cutting" })),
      sel("masala-chai", { choice: "Regular" }),
    );
    expect(cart).toHaveLength(2);
  });

  it("refuses invalid selections and more than 30 lines", () => {
    expect(() => addSelection([], sel("masala-chai"))).toThrow(CartError);
    // 9 extras combinations per item (0–2 cheese × 0–2 chutney) across 4 items = 36 distinct lines.
    const distinct: CartSelection[] = [];
    for (const slug of ["classic-vada-pav", "bombay-vada-pav", "cheese-vada-pav", "classic-potato-puff"]) {
      for (let c = 0; c <= 2; c++)
        for (let h = 0; h <= 2; h++) distinct.push(sel(slug, { extras: { "Extra cheese": c, "Extra chutney": h } }));
    }
    let cart: CartSelection[] = [];
    for (const s of distinct.slice(0, MAX_LINES)) cart = addSelection(cart, s);
    expect(cart).toHaveLength(MAX_LINES);
    expect(() => addSelection(cart, sel("water"))).toThrow(/up to 30/);
  });

  it("setQuantity updates or removes a line", () => {
    const cart = [sel("water", { quantity: 2 })];
    const key = lineKey(cart[0]);
    expect(setQuantity(cart, key, 5)[0].quantity).toBe(5);
    expect(setQuantity(cart, key, 0)).toEqual([]);
  });

  it("priceCart totals valid lines and drops stale ones", () => {
    const result = priceCart([sel("water", { quantity: 2 }), sel("discontinued-item"), sel("single-samosa")]);
    expect(result.lines).toHaveLength(2);
    expect(result.subtotalCents).toBe(2 * 249 + 490);
    expect(result.itemCount).toBe(3);
  });
});

describe("parseStoredCart (untrusted localStorage)", () => {
  it("keeps valid selections only; never trusts stored prices", () => {
    const parsed = parseStoredCart([
      { itemSlug: "water", choice: null, extras: {}, quantity: 1, priceCents: 1 },
      { itemSlug: "masala-chai", choice: "Regular", extras: {}, quantity: 2 },
      { itemSlug: "masala-chai", extras: {}, quantity: 1 },
      "junk",
      null,
      { itemSlug: 42, quantity: 1 },
    ]);
    expect(parsed.map((p) => p.itemSlug)).toEqual(["water", "masala-chai"]);
    expect(priceCart(parsed).subtotalCents).toBe(249 + 2 * 549);
  });

  it("handles non-arrays", () => {
    expect(parseStoredCart({ hacked: true })).toEqual([]);
    expect(parseStoredCart(null)).toEqual([]);
  });
});

describe("needsOptions", () => {
  it("chai (size) and vada pav (extras) need the sheet; water and bun maska add directly", () => {
    expect(needsOptions("masala-chai")).toBe(true);
    expect(needsOptions("classic-vada-pav")).toBe(true);
    expect(needsOptions("water")).toBe(false);
    expect(needsOptions("classic-bun-maska")).toBe(false);
  });
});
