import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { BUSINESS, FRANCHISE_FORM_URL } from "@/domain/business";
import { findItem, MENU } from "@/domain/menu";
import { photoFor } from "@/domain/menu-photos";
import { LateNight } from "@/ui/hours";
import { InstagramLink } from "@/ui/icons";

export const metadata: Metadata = {
  title: "Franchise",
  description: "Interested in opening a Chai Tapri near you? Find out about the brand and register your interest.",
};

/*
 * Franchise page (client request, 29 Oct 2026). DRAFT copy for the owner's sign-off.
 * Facts only (A-business-research §2–3, MENU.md): no fees, earnings, territories or support promises,
 * because none have been provided (CLIENT_QUESTIONS F14) and franchise marketing in Australia falls
 * under the Franchising Code of Conduct. The closing note needs legal review before launch.
 */

const itemCount = MENU.reduce((n, c) => n + c.items.length, 0);
const { stars, reviews, checked } = BUSINESS.googleRating;

const REASONS = [
  {
    tone: "tin-mustard",
    tilt: "sm:-rotate-1",
    big: `${stars}★`,
    title: "Loved on Google",
    text: `${stars} stars from ${reviews} Google reviews (${checked}).`,
  },
  {
    tone: "tin-teal",
    tilt: "sm:rotate-1 sm:translate-y-4",
    big: `${itemCount}`,
    title: "A tight, chai-led menu",
    text: `${MENU.length} categories, ${itemCount} items: chai in Cutting and Regular, Mumbai street snacks, bun maska, sandwiches, Maggi and lassi.`,
  },
  {
    tone: "tin-red",
    tilt: "sm:rotate-2",
    big: "2026",
    title: "New on William Street",
    text: "Featured on the City of Perth's “New businesses on the block” list in May 2026.",
  },
  {
    tone: "tin-paper",
    tilt: "sm:-rotate-2 sm:translate-y-3",
    big: "Dine in",
    title: "& takeaway",
    text: "A place to sit with a chai and some gupshup, and a counter built for grab-and-go.",
  },
] as const;

const STEPS = [
  { title: "Tell us about you", text: "Who you are, your experience, and the area you have in mind." },
  { title: "We take a look", text: "The Chai Tapri team reviews enquiries as they come in." },
  { title: "Let's talk chai", text: "If it looks like a fit, we'll be in touch to talk it through." },
];

export default function FranchisePage() {
  const photo = photoFor(findItem("masala-chai")!);
  return (
    <>
      <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 pt-10 pb-16 sm:px-6 lg:grid-cols-12 lg:pt-16">
        <div className="lg:col-span-7">
          <p className="tin tin-red font-sign inline-block -rotate-2 px-5 py-3 text-2xl">Franchise</p>
          <h1 className="font-display text-display mt-6 leading-[0.95] font-extrabold tracking-tight">
            Bring a tapri to your street
          </h1>
          <p className="text-ink-soft mt-5 max-w-xl text-lg">
            Chai Tapri started on William Street, Northbridge, with cutting chai, bun maska and vada pav. If you&apos;d
            love to open one near you, we&apos;d like to hear from you.
          </p>
          <a
            href="#enquire"
            className="bg-accent text-accent-ink mt-8 inline-flex min-h-12 items-center rounded-full px-7 text-lg font-bold hover:brightness-110"
          >
            Register your interest
          </a>
        </div>
        {photo ? (
          <div className="tin tin-paper mx-auto w-full max-w-sm rotate-2 p-3 lg:col-span-5">
            <div className="relative aspect-square overflow-hidden rounded-lg">
              <Image
                src={photo.src}
                alt="A glass of masala chai at Chai Tapri"
                fill
                sizes="(min-width: 1024px) 384px, 90vw"
                className="object-cover"
              />
            </div>
          </div>
        ) : null}
      </section>

      <section aria-labelledby="why" className="bg-surface">
        <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
          <h2 id="why" className="font-sign text-6xl">
            Why Chai Tapri
          </h2>
          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {REASONS.map((r) => (
              <li key={r.title} className={`tin ${r.tone} ${r.tilt} flex flex-col gap-2 p-7`}>
                <p className="font-sign text-5xl" aria-hidden="true">
                  {r.big}
                </p>
                <h3 className="text-lg font-bold">{r.title}</h3>
                <p>{r.text}</p>
              </li>
            ))}
          </ul>
          <p className="mt-10 text-lg">
            <span className="font-semibold">
              <LateNight fallback="Open late on weekends." />
            </span>{" "}
            <Link href="/menu" className="font-semibold underline">
              See the full menu
            </Link>
          </p>
        </div>
      </section>

      <section aria-labelledby="how" className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
        <h2 id="how" className="font-sign text-6xl">
          How it works
        </h2>
        <ol className="mt-10 grid gap-8 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-4">
              <span
                className="font-sign bg-mustard text-ink inline-flex size-14 shrink-0 items-center justify-center rounded-full text-3xl"
                aria-hidden="true"
              >
                {i + 1}
              </span>
              <div>
                <h3 className="text-lg font-bold">{s.title}</h3>
                <p className="text-ink-soft mt-1">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section
        id="enquire"
        aria-labelledby="enquire-h"
        className="mx-auto w-full max-w-3xl scroll-mt-28 px-4 pb-8 sm:px-6"
      >
        <h2 id="enquire-h" className="font-sign text-6xl">
          Register your interest
        </h2>
        {FRANCHISE_FORM_URL ? (
          <div className="tin tin-paper mt-8 p-3">
            <iframe
              src={FRANCHISE_FORM_URL}
              title="Chai Tapri franchise enquiry form"
              loading="lazy"
              className="h-[1100px] w-full rounded-lg border-0"
            />
          </div>
        ) : (
          <div className="tin tin-mustard mt-8 flex flex-col gap-4 p-8">
            <p className="font-sign text-4xl">Enquiry form coming soon</p>
            <p>
              In the meantime, give us a call or send us a message on Instagram and tell us a little about yourself.
            </p>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <a href={BUSINESS.phone.href} className="inline-flex min-h-11 items-center font-semibold underline">
                Call {BUSINESS.phone.display}
              </a>
              <InstagramLink url={BUSINESS.instagram.url} handle={BUSINESS.instagram.handle} />
            </div>
          </div>
        )}
        {/* [Draft — legal review required before launch, CLIENT_QUESTIONS F14] */}
        <p className="text-ink-soft mt-6 text-sm">
          Registering your interest isn&apos;t an offer of a franchise or an agreement of any kind. Any franchise
          opportunity would come with the disclosure documents required under Australia&apos;s Franchising Code of
          Conduct.
        </p>
      </section>
    </>
  );
}
