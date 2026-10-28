import type { Metadata } from "next";
import { formatPrice, MENU, MENU_BOARD_NOTE, type MenuItem } from "@/domain/menu";
import { AddButton } from "@/ui/cart/add-button";
import { CategoryNav } from "@/ui/category-nav";
import { MenuThumb } from "@/ui/menu-thumb";

export const metadata: Metadata = {
  title: "Menu",
  description: "Chai, bun maska, vada pav, samosa, sandwiches, Maggi and lassi at Chai Tapri, Northbridge.",
};

function Price({ item }: { item: MenuItem }) {
  if (item.price.kind === "single") return <span className="tabular-nums">{formatPrice(item.price.cents)}</span>;
  return (
    <span className="text-right tabular-nums">
      {item.price.choices.map((c, i) => (
        <span key={c.label} className="block sm:inline">
          {i > 0 ? <span className="hidden sm:inline"> · </span> : null}
          {c.label} {formatPrice(c.priceCents)}
        </span>
      ))}
    </span>
  );
}

// Browse-only for now: ordering (item sheet, cart) arrives with slice-1 checkout. The page is static
// and cached; the live status is the header chip, fetched separately (BR-AV-12).
export default function MenuPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
      <div className="pt-12 pb-6 sm:pt-16">
        <h1 className="font-display text-display leading-none font-extrabold tracking-tight">Menu</h1>
        <p className="mt-4 max-w-xl">
          Tap <span className="font-semibold">Add</span> to build your order. Prices are the same as in the shop. Online
          payment is coming soon; until then, show your order at the counter.
        </p>
      </div>

      <CategoryNav categories={MENU.map(({ slug, name }) => ({ slug, name }))} />

      {MENU.map((category) => (
        <section
          key={category.slug}
          id={category.slug}
          aria-labelledby={`${category.slug}-h`}
          className="scroll-mt-[calc(var(--header-h,3.5rem)+4.5rem)] pt-12"
        >
          <h2
            id={`${category.slug}-h`}
            tabIndex={-1}
            className="font-display text-xl font-extrabold tracking-tight outline-none"
          >
            {category.name}
          </h2>
          {category.intro ? <p className="mt-1 max-w-[60ch]">{category.intro}</p> : null}
          <ul className="mt-4">
            {category.items.map((item) => (
              <li key={item.slug} className="border-ink/15 flex items-center gap-4 border-b py-4 first:border-t">
                <MenuThumb item={item} />
                <span className="flex flex-1 flex-wrap items-center justify-between gap-x-6 gap-y-2">
                  <span className="font-semibold">{item.name}</span>
                  <span className="flex items-center gap-4">
                    <Price item={item} />
                    <AddButton slug={item.slug} />
                  </span>
                </span>
              </li>
            ))}
          </ul>
          {category.extras.length > 0 ? (
            <p className="mt-3 text-sm">
              Add: {category.extras.map((e) => `${e.name} ${formatPrice(e.priceCents)}`).join(" · ")}
            </p>
          ) : null}
        </section>
      ))}

      <div className="mt-12 flex flex-col gap-1 text-sm">
        <p>{MENU_BOARD_NOTE}</p>
        {/* [Assumption — CLIENT_QUESTIONS Q10] allergen data pending; SLICE-01 §2 wording. */}
        <p>Allergen information: please ask our staff.</p>
      </div>
    </div>
  );
}
