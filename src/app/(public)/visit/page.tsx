import type { Metadata } from "next";
import { BUSINESS } from "@/domain/business";
import { HoursTable } from "@/ui/hours";
import { InstagramLink } from "@/ui/icons";
import { ShopMap } from "@/ui/shop-map";

export const metadata: Metadata = {
  title: "Visit",
  description: "Find Chai Tapri at Shop 6/189 William St, Northbridge. Opening hours, directions and contact.",
};

// Wayfinding, transport, parking and FAQs (SITEMAP) wait for verified details from the owner.
export default function VisitPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
      <h1 className="font-display text-display pt-12 leading-none font-extrabold tracking-tight sm:pt-16">Visit</h1>

      <div className="mt-12 grid gap-12 sm:grid-cols-12">
        <section aria-labelledby="where" className="sm:col-span-5">
          <h2 id="where" className="font-display text-xl font-extrabold tracking-tight">
            Where
          </h2>
          <address className="mt-3 text-lg not-italic">
            {BUSINESS.addressLines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </address>
          <p className="mt-3">Dine in &amp; takeaway available.</p>

          <h2 className="font-display mt-10 text-xl font-extrabold tracking-tight">Contact</h2>
          <ul className="mt-3">
            <li>
              Phone:{" "}
              <a href={BUSINESS.phone.href} className="inline-flex min-h-11 items-center font-semibold underline">
                {BUSINESS.phone.display}
              </a>
            </li>
            <li className="-ml-2.5">
              <InstagramLink url={BUSINESS.instagram.url} handle={BUSINESS.instagram.handle} />
            </li>
          </ul>
        </section>

        <section aria-labelledby="hours" className="sm:col-span-6 sm:col-start-7">
          <h2 id="hours" className="font-display text-xl font-extrabold tracking-tight">
            Opening hours
          </h2>
          <div className="mt-3">
            <HoursTable />
          </div>
        </section>
      </div>

      <section aria-label="Map" className="mt-14">
        <ShopMap className="-rotate-[0.5deg]" height="h-80 sm:h-[26rem]" />
      </section>
    </div>
  );
}
