"use client";

/** − n + control with accessible names ("Remove one Extra cheese"). */
export function Stepper({
  value,
  min,
  max,
  label,
  onChange,
  size = "md",
}: {
  value: number;
  min: number;
  max: number;
  label: string;
  onChange: (next: number) => void;
  size?: "sm" | "md";
}) {
  const btn = size === "sm" ? "size-9 text-lg" : "size-11 text-xl";
  return (
    <span className="border-ink/20 inline-flex items-center rounded-full border-2">
      <button
        type="button"
        className={`${btn} inline-flex items-center justify-center rounded-full font-bold disabled:opacity-30`}
        aria-label={`Remove one ${label}`}
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
      >
        −
      </button>
      <span className="min-w-6 text-center font-semibold tabular-nums" aria-label={`${label}: ${value}`}>
        {value}
      </span>
      <button
        type="button"
        className={`${btn} inline-flex items-center justify-center rounded-full font-bold disabled:opacity-30`}
        aria-label={`Add one ${label}`}
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
      >
        +
      </button>
    </span>
  );
}
