import Image from "next/image";
import Link from "next/link";
import { BUSINESS } from "@/domain/business";
import { findItem, formatPrice, lowestPriceCents, type MenuItem } from "@/domain/menu";
import { photoFor } from "@/domain/menu-photos";
import { AddButton } from "@/ui/cart/add-button";
import { LateNight, TodayHours } from "@/ui/hours";
import { InstagramLink } from "@/ui/icons";
import { HangingSign } from "@/ui/signs/hanging-sign";
import { Marquee } from "@/ui/signs/marquee";
import { Steam } from "@/ui/signs/steam";
import { GoogleReviews } from "@/ui/reviews/google-reviews";
import { ShopMap } from "@/ui/shop-map";

/*
 * Home, revised 29 Oct 2026 after client feedback: playful and informative, like the enamel signs on
 * the shop walls. Every sign here is original (no copies of the third-party posters in the shop).
 * Copy is draft for the owner's sign-off. Facts: MENU.md prices, A-business-research §2 (address,
 * Instagram bio items, City of Perth tagline). Dish explanations are general, not recipe claims.
 */

const item = (slug: string) => findItem(slug)!;
const price = (slug: string) => formatPrice(lowestPriceCents(item(slug)));
const choicePrice = (slug: string, label: string) => {
  const p = item(slug).price;
  return p.kind === "choice" ? formatPrice(p.choices.find((c) => c.label === label)!.priceCents) : price(slug);
};

const CHAI_101 = [
  {
    tone: "tin-teal",
    tilt: "sm:-rotate-2",
    word: "Cutting",
    text: `Half a glass, full strength. A Cutting is ${choicePrice("masala-chai", "Cutting")}; want the whole glass? Regular is ${choicePrice("masala-chai", "Regular")}.`,
    href: "/menu#chai",
  },
  {
    tone: "tin-mustard",
    tilt: "sm:rotate-1 sm:translate-y-6",
    word: "Tapri",
    text: "The tiny roadside chai stall found on street corners all over India. This one happens to be on William Street.",
    href: "/visit",
  },
  {
    tone: "tin-red",
    tilt: "sm:rotate-2",
    word: "Bun maska",
    text: `A soft bun with maska (butter), made for dunking in your chai. From ${price("classic-bun-maska")}.`,
    href: "/menu#bun-maska",
  },
  {
    tone: "tin-paper",
    tilt: "sm:-rotate-1 sm:translate-y-4",
    word: "Vada pav",
    text: `Mumbai's street-food favourite: a spiced potato vada tucked into a soft pav. From ${price("classic-vada-pav")}.`,
    href: "/menu#vada-pav",
  },
] as const;

const START_HERE = ["masala-chai", "classic-bun-maska", "classic-vada-pav", "single-samosa"] as const;
const TILTS = ["-rotate-2", "rotate-1", "-rotate-1", "rotate-2"];

function PhotoSign({ menuItem, tilt }: { menuItem: MenuItem; tilt: string }) {
  const photo = photoFor(menuItem);
  const from = menuItem.price.kind === "choice";
  return (
    <li className={`tin tin-paper flex flex-col p-2 transition-transform duration-300 hover:rotate-0 sm:p-3 ${tilt}`}>
      {photo ? (
        <div className="bg-surface relative aspect-square overflow-hidden rounded-lg">
          <Image
            src={photo.src}
            alt=""
            fill
            sizes="(min-width: 1024px) 280px, (min-width: 640px) 45vw, 90vw"
            className="object-cover"
          />
        </div>
      ) : null}
      <div className="flex flex-1 flex-col gap-3 px-1 pt-3 pb-1 sm:pt-4">
        <h3 className="font-sign text-2xl sm:text-3xl">{menuItem.name}</h3>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 sm:gap-3">
          <span className="bg-mustard text-ink inline-block -rotate-3 rounded px-2 py-1 font-bold tabular-nums">
            {from ? "from " : ""}
            {formatPrice(lowestPriceCents(menuItem))}
          </span>
          <AddButton slug={menuItem.slug} />
        </div>
      </div>
    </li>
  );
}

export default function Home() {
  const chaiPhoto = photoFor(item("masala-chai"));
  return (
    <>
      {/* Hero ------------------------------------------------------------------ */}
      <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pt-10 pb-16 sm:px-6 lg:grid-cols-12 lg:pt-16">
        <div className="lg:col-span-7">
          <p className="tin tin-mustard font-sign inline-block -rotate-2 px-5 py-3 text-2xl">Ek cutting ho jaye?</p>
          <h1 className="font-display text-display mt-6 leading-[0.95] font-extrabold tracking-tight">
            Cutting chai &amp; Mumbai street snacks on William Street
          </h1>
          <p className="text-ink-soft mt-5 max-w-xl text-lg">{BUSINESS.tagline}</p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/menu"
              className="bg-accent text-accent-ink inline-flex min-h-12 items-center rounded-full px-7 text-lg font-bold hover:brightness-110"
            >
              Order from the menu
            </Link>
            <Link href="/visit" className="inline-flex min-h-12 items-center px-2 font-semibold underline">
              Find the shop
            </Link>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-md lg:col-span-5">
          {chaiPhoto ? (
            <div className="tin tin-paper rotate-2 p-3">
              <div className="relative aspect-[5/4] overflow-hidden rounded-lg">
                <Image
                  src={chaiPhoto.src}
                  alt="A glass of masala chai at Chai Tapri"
                  fill
                  priority
                  sizes="(min-width: 1024px) 448px, 90vw"
                  className="object-cover"
                />
                <Steam className="absolute top-[4%] left-1/2 w-28 -translate-x-1/2 text-white/80" />
              </div>
            </div>
          ) : null}
          <HangingSign className="absolute -top-14 -right-2 scale-75 sm:-right-10 sm:scale-90" />
        </div>
      </section>

      <Marquee
        words={["Garam chai", "Cutting", "Bun maska", "Vada pav", "Samosa", "Maggi", "Lassi", "Dine in", "Takeaway"]}
      />

      {/* Chai 101 -------------------------------------------------------------- */}
      <section aria-labelledby="chai-101" className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id="chai-101" className="font-sign text-6xl">
            Chai 101
          </h2>
          <p className="text-ink-soft max-w-sm">New to the tapri? Four words and you&apos;ll order like a regular.</p>
        </div>
        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {CHAI_101.map((s) => (
            <li key={s.word} className={`tin ${s.tone} ${s.tilt} flex flex-col gap-3 p-7`}>
              <h3 className="font-sign text-4xl">{s.word}</h3>
              <p className="flex-1">{s.text}</p>
              <Link href={s.href} className="font-semibold underline">
                {s.href === "/visit" ? "Find it" : "On the menu"}
                <span className="sr-only">: {s.word}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Start here ------------------------------------------------------------ */}
      <section aria-labelledby="start-here" className="bg-surface">
        <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
          <h2 id="start-here" className="font-sign text-6xl">
            Start here
          </h2>
          <p className="text-ink-soft mt-2 max-w-md">
            The ones regulars come back for. Add them straight to your order.
          </p>
          <ul className="mt-10 grid grid-cols-2 gap-x-4 gap-y-6 sm:gap-8 lg:grid-cols-4">
            {START_HERE.map((slug, i) => (
              <PhotoSign key={slug} menuItem={item(slug)} tilt={TILTS[i]} />
            ))}
          </ul>
          <p className="mt-10 text-lg">
            Can&apos;t choose? <span className="font-semibold">Cutting Chai + Samosa</span> is{" "}
            {price("cutting-chai-samosa")}.{" "}
            <Link href="/menu#combos" className="font-semibold underline">
              See all combos
            </Link>
          </p>
        </div>
      </section>

      {/* Google reviews --------------------------------------------------------- */}
      <section aria-labelledby="reviews" className="mx-auto w-full max-w-6xl px-4 pt-20 sm:px-6">
        <GoogleReviews />
      </section>

      {/* Up late + visit ------------------------------------------------------- */}
      <section className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-12">
        {/* Natural height (self-start): beside the map it would otherwise stretch to the map's height. */}
        <div className="tin tin-teal flex -rotate-1 flex-col gap-3 self-start p-7 sm:p-8 lg:col-span-5">
          <h2 className="font-sign text-mustard text-5xl">Up late?</h2>
          <p className="text-xl font-semibold">
            <LateNight fallback="Check today's hours before you head over." />
          </p>
          <p>
            <TodayHours />. Pull up a chair for a chai and some gupshup, or grab it to go.
          </p>
          <Link href="/visit" className="font-semibold underline">
            All opening hours
          </Link>
        </div>

        <div className="flex flex-col gap-6 lg:col-span-7">
          <div className="tin tin-teal -rotate-1 self-start px-6 py-3" aria-hidden="true">
            <p className="font-sign text-4xl tracking-wider">William St</p>
          </div>
          <address className="text-2xl font-semibold not-italic">
            {BUSINESS.addressLines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </address>
          <p className="text-ink-soft">Dine in &amp; takeaway.</p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <a href={BUSINESS.phone.href} className="inline-flex min-h-11 items-center font-semibold underline">
              Call {BUSINESS.phone.display}
            </a>
            <InstagramLink url={BUSINESS.instagram.url} handle={BUSINESS.instagram.handle} />
          </div>
          <ShopMap className="rotate-1" height="h-64" />
        </div>
      </section>
    </>
  );
}
