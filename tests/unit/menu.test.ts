import { describe, expect, it } from "vitest";
import { findItem, formatPrice, lowestPriceCents, MENU } from "@/domain/menu";

const items = MENU.flatMap((c) => c.items);

describe("menu data (docs/MENU.md, transcribed from the board)", () => {
  it("has 11 categories and 37 items (34 single items + 3 combos)", () => {
    expect(MENU).toHaveLength(11);
    expect(items).toHaveLength(37);
    expect(MENU.find((c) => c.slug === "combos")?.items).toHaveLength(3);
  });

  it("slugs are unique and URL-safe", () => {
    const slugs = [...MENU.map((c) => c.slug), ...items.map((i) => i.slug)];
    expect(new Set(items.map((i) => i.slug)).size).toBe(items.length);
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("every price is a positive whole number of cents", () => {
    const prices = items.flatMap((i) =>
      i.price.kind === "single" ? [i.price.cents] : i.price.choices.map((c) => c.priceCents),
    );
    for (const p of prices) expect(Number.isInteger(p) && p > 0).toBe(true);
  });

  it.each([
    ["masala-chai", 449, "Cutting $4.49 / Regular $5.49"],
    ["bournvita", 549, "Regular only"],
    ["veg-sandwich", 790, "Raw $7.90 / Grilled $9.90"],
    ["chefs-special-sandwich", 1590, "single"],
    ["cutting-chai-samosa", 849, "combo"],
    ["water", 249, "single"],
  ])("%s starts at %i cents (%s)", (slug, cents) => {
    expect(lowestPriceCents(findItem(slug)!)).toBe(cents);
  });

  it("chai has a Cutting/Regular size choice; Bournvita is Regular only", () => {
    expect(findItem("ginger-chai")!.price).toMatchObject({
      group: "Size",
      choices: [
        { label: "Cutting", priceCents: 449 },
        { label: "Regular", priceCents: 549 },
      ],
    });
    expect(findItem("bournvita")!.price).toMatchObject({ choices: [{ label: "Regular", priceCents: 549 }] });
  });

  it("extras follow the board: cheese + chutney on puffs, vada pav, sandwiches, street specials; chutney only on samosa", () => {
    const extras = Object.fromEntries(MENU.map((c) => [c.slug, c.extras.map((e) => `${e.name} ${e.priceCents}`)]));
    for (const slug of ["puffs", "vada-pav", "sandwiches", "street-specials"]) {
      expect(extras[slug]).toEqual(["Extra cheese 200", "Extra chutney 150"]);
    }
    expect(extras.samosa).toEqual(["Extra chutney 150"]);
    expect(extras.chai).toEqual([]);
  });

  it("14 single items have no photo (MENU.md summary)", () => {
    const singles = MENU.filter((c) => c.slug !== "combos").flatMap((c) => c.items);
    expect(singles.filter((i) => i.photo === null)).toHaveLength(14);
  });

  it("invents no item descriptions (pending client answer)", () => {
    for (const i of items) expect(Object.keys(i)).not.toContain("description");
  });
});

describe("formatPrice", () => {
  it.each([
    [449, "$4.49"],
    [600, "$6.00"],
    [1599, "$15.99"],
    [0, "$0.00"],
  ])("%i → %s", (cents, text) => {
    expect(formatPrice(cents)).toBe(text);
  });

  it("rejects fractions and negatives", () => {
    expect(() => formatPrice(4.5)).toThrow(RangeError);
    expect(() => formatPrice(-1)).toThrow(RangeError);
  });
});
