/**
 * A painted street banner that scrolls: shop words, not slogans. Decorative (the same words are
 * on the page), so hidden from screen readers; pauses on hover; stops for reduced motion.
 */
export function Marquee({ words }: { words: string[] }) {
  const run = (
    <span className="flex shrink-0 items-center">
      {words.map((w) => (
        <span key={w} className="flex items-center">
          <span className="font-sign px-5 text-2xl sm:text-3xl">{w}</span>
          <svg viewBox="0 0 10 10" className="text-accent size-3" aria-hidden="true">
            <circle cx="5" cy="5" r="5" fill="currentColor" />
          </svg>
        </span>
      ))}
    </span>
  );
  return (
    <div className="bg-mustard text-ink border-ink overflow-hidden border-y-4 py-3" aria-hidden="true">
      <div className="animate-marquee flex w-max hover:[animation-play-state:paused]">
        {run}
        {run}
      </div>
    </div>
  );
}
