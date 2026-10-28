"use client";

import { useState } from "react";
import { BUSINESS } from "@/domain/business";
import type { ReviewDto, ReviewsDto } from "@/server/reviews/google-places";
import { useJson } from "../use-json";

type State = { kind: "idle" } | { kind: "loading" } | { kind: "ready"; data: ReviewsDto } | { kind: "error" };

function Stars({ rating }: { rating: number | null }) {
  if (rating === null) return null;
  const full = Math.round(rating);
  return (
    <span role="img" aria-label={`${rating} out of 5 stars`} className="text-brand tracking-wider">
      {"★".repeat(full)}
      <span className="text-ink/20">{"★".repeat(5 - full)}</span>
    </span>
  );
}

function ReviewCard({ review, tilt }: { review: ReviewDto; tilt: string }) {
  const [open, setOpen] = useState(false);
  const long = review.text.length > 280;
  return (
    <li className={`tin tin-paper flex flex-col gap-3 p-6 ${tilt}`}>
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="bg-mustard text-ink font-sign inline-flex size-11 shrink-0 items-center justify-center rounded-full text-xl"
        >
          {review.author.charAt(0).toUpperCase()}
        </span>
        <div className="flex flex-col">
          {/* Attribution: the author's name sits with the review, linked to their profile (Google policy). */}
          {review.authorUri ? (
            <a href={review.authorUri} rel="noopener noreferrer nofollow" className="font-semibold underline">
              {review.author}
            </a>
          ) : (
            <span className="font-semibold">{review.author}</span>
          )}
          <span className="text-ink-soft flex items-center gap-2 text-sm">
            <Stars rating={review.rating} />
            {review.relativeTime ? <span>{review.relativeTime}</span> : null}
          </span>
        </div>
      </div>
      <p className={long && !open ? "line-clamp-6" : undefined}>{review.text}</p>
      {long ? (
        <button
          type="button"
          className="self-start text-sm font-semibold underline"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          {open ? "Show less" : "Read more"}
        </button>
      ) : null}
    </li>
  );
}

const TILTS = ["-rotate-1", "rotate-1", "rotate-[0.5deg]", "-rotate-[0.5deg]", "rotate-1"];

/**
 * "What people say on Google" (ADR-0013). Loads live reviews only when asked: each load is a paid
 * Places API request and Google's terms forbid storing them. Before that, the dated rating we checked.
 */
export function GoogleReviews() {
  const [state, setState] = useState<State>({ kind: "idle" });
  const { stars, reviews, checked } = BUSINESS.googleRating;
  // Offer live reviews only once a Google key is configured (free check, no call to Google).
  const status = useJson<{ configured: boolean }>("/api/v1/reviews/status", 3_600_000);
  const canLoad = status.state === "ready" && status.data.configured;

  const load = async () => {
    setState({ kind: "loading" });
    try {
      const res = await fetch("/api/v1/reviews", { headers: { accept: "application/json" } });
      if (!res.ok) throw new Error(String(res.status));
      setState({ kind: "ready", data: (await res.json()) as ReviewsDto });
    } catch {
      setState({ kind: "error" });
    }
  };

  const live = state.kind === "ready" ? state.data : null;
  const readAllUri = live?.googleMapsUri ?? BUSINESS.directionsUrl;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h2 id="reviews" className="font-sign text-6xl">
            What people say
          </h2>
          <p className="mt-3 flex flex-wrap items-baseline gap-x-3 text-lg">
            {live && live.rating !== null ? (
              <>
                <span className="font-sign text-4xl">{live.rating.toFixed(1)}</span>
                <Stars rating={live.rating} />
                <span className="text-ink-soft">
                  {live.userRatingCount !== null ? `${live.userRatingCount} reviews on Google` : "on Google"}
                </span>
              </>
            ) : (
              <>
                <span className="font-sign text-4xl">{stars.toFixed(1)}</span>
                <Stars rating={stars} />
                <span className="text-ink-soft">
                  from {reviews} Google reviews ({checked})
                </span>
              </>
            )}
          </p>
        </div>
        {canLoad && (state.kind === "idle" || state.kind === "loading") ? (
          <button
            type="button"
            onClick={load}
            disabled={state.kind === "loading"}
            className="bg-accent text-accent-ink inline-flex min-h-12 items-center rounded-full px-6 font-bold hover:brightness-110 disabled:opacity-60"
          >
            {state.kind === "loading" ? "Loading reviews…" : "Show Google reviews"}
          </button>
        ) : null}
      </div>

      <div aria-live="polite" className="[&:not(:empty)]:my-4">
        {state.kind === "error" ? (
          <p className="tin tin-mustard inline-block px-5 py-4 font-semibold">
            Google reviews can&apos;t be loaded right now.{" "}
            <a href={readAllUri} className="underline">
              Read them on Google
            </a>
            .
          </p>
        ) : null}

        {live ? (
          live.reviews.length > 0 ? (
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {live.reviews.map((r, i) => (
                <ReviewCard key={`${r.author}-${r.publishTime ?? i}`} review={r} tilt={TILTS[i % TILTS.length]} />
              ))}
            </ul>
          ) : (
            <p>No written reviews to show right now.</p>
          )
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        {live ? (
          <span className="text-ink-soft">
            Reviews from <span className="text-ink font-semibold">Google</span>: up to 5, selected by Google.
          </span>
        ) : null}
        <a
          href={readAllUri}
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center font-semibold underline"
        >
          Read all reviews on Google
        </a>
        {live ? (
          <a
            href={live.writeReviewUri}
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center font-semibold underline"
          >
            Leave a review
          </a>
        ) : null}
      </div>
    </div>
  );
}
