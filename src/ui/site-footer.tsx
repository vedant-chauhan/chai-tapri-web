import Link from "next/link";
import { BUSINESS } from "@/domain/business";
import { TodayHours } from "./hours";
import { InstagramLink } from "./icons";

export function SiteFooter() {
  return (
    <footer className="bg-band text-band-ink mt-24">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 sm:grid-cols-3 sm:px-6">
        <div>
          <h2 className="font-semibold">Find us</h2>
          <address className="mt-2 not-italic">
            {BUSINESS.addressLines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </address>
          <a href={BUSINESS.directionsUrl} className="mt-2 inline-flex min-h-11 items-center underline">
            Get directions
          </a>
        </div>
        <div>
          <h2 className="font-semibold">Hours</h2>
          <p className="mt-2">
            <TodayHours />
          </p>
          <Link href="/visit" className="inline-flex min-h-11 items-center underline">
            All opening hours
          </Link>
        </div>
        <div>
          <h2 className="font-semibold">Say hello</h2>
          <p className="mt-2">
            <a href={BUSINESS.phone.href} className="inline-flex min-h-11 items-center underline">
              {BUSINESS.phone.display}
            </a>
          </p>
          <p className="-ml-2.5">
            <InstagramLink url={BUSINESS.instagram.url} handle={BUSINESS.instagram.handle} />
          </p>
          <p className="flex flex-wrap gap-x-5">
            <Link href="/merch" className="inline-flex min-h-11 items-center underline">
              Merch
            </Link>
            <Link href="/franchise" className="inline-flex min-h-11 items-center underline">
              Franchise with us
            </Link>
          </p>
        </div>
      </div>
      <div className="mx-auto w-full max-w-6xl px-4 pb-12 sm:px-6">
        {/* The full logo, hung like one of the shop's signs. */}
        <div className="tin tin-paper inline-block -rotate-2 px-8 py-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo-full.webp"
            alt="Chai Tapri, Northbridge"
            width={220}
            height={246}
            className="w-44 sm:w-56"
          />
        </div>
      </div>
    </footer>
  );
}
