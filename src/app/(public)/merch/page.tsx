import type { Metadata } from "next";
import Link from "next/link";
import { BUSINESS } from "@/domain/business";
import { InstagramLink } from "@/ui/icons";
import { Steam } from "@/ui/signs/steam";

export const metadata: Metadata = {
  title: "Merch",
  description: "Chai Tapri merchandise is on its way. Follow us on Instagram to hear first.",
};

/*
 * Merch placeholder (client, 31 Oct 2026: no merchandise yet, planned for the near future).
 * Names no products: none are decided (CLIENT_QUESTIONS F15). When merch arrives it joins the same
 * catalogue and cart as the menu (DATABASE.md §5 "Future merchandise", products.product_type = merch).
 */
export default function MerchPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
      <section className="grid items-center gap-12 pt-10 pb-16 lg:grid-cols-12 lg:pt-16">
        <div className="lg:col-span-7">
          <p className="tin tin-teal font-sign inline-block -rotate-2 px-5 py-3 text-2xl">Merch</p>
          <h1 className="font-display text-display mt-6 leading-[0.95] font-extrabold tracking-tight">
            Something&apos;s brewing
          </h1>
          <p className="text-ink-soft mt-5 max-w-xl text-lg">
            Chai Tapri merch is on its way. We&apos;re not ready to show it yet, but when it lands, you&apos;ll be able
            to add it to your order right here, next to your chai.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link
              href="/menu"
              className="bg-accent text-accent-ink inline-flex min-h-12 items-center rounded-full px-7 text-lg font-bold hover:brightness-110"
            >
              Order from the menu
            </Link>
            <span className="flex items-center gap-1 font-semibold">
              Hear first on Instagram
              <InstagramLink url={BUSINESS.instagram.url} handle={BUSINESS.instagram.handle} />
            </span>
          </div>
        </div>

        {/* An empty "coming soon" shelf sign: the one illustration, no invented products. */}
        <div className="mx-auto w-full max-w-sm lg:col-span-5" aria-hidden="true">
          <div className="tin tin-mustard flex rotate-2 flex-col items-center gap-2 px-8 pt-6 pb-8 text-center">
            <Steam className="text-ink/40 -mb-2 w-20" />
            <svg
              viewBox="0 0 120 90"
              className="text-ink w-32"
              fill="none"
              stroke="currentColor"
              strokeWidth="5"
              strokeLinejoin="round"
            >
              <path d="M18 14h70v38a26 26 0 0 1-26 26H44a26 26 0 0 1-26-26V14Z" />
              <path d="M88 26h8a14 14 0 0 1 0 28h-8" />
            </svg>
            <p className="font-sign mt-2 text-5xl">Coming soon</p>
            <p className="font-semibold">Chai Tapri, Northbridge</p>
          </div>
        </div>
      </section>
    </div>
  );
}
