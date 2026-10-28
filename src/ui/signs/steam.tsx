/** Three wisps of steam rising from a glass (DESIGN_DIRECTION §7 "signature move"). CSS only. */
export function Steam({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 80" className={`pointer-events-none ${className}`} aria-hidden="true" fill="none">
      {[
        { d: "M30 78c-10-14 10-22 0-38s8-22 2-36", delay: "0s" },
        { d: "M60 78c-10-14 10-22 0-38s8-22 2-36", delay: "1.1s" },
        { d: "M90 78c-10-14 10-22 0-38s8-22 2-36", delay: "2.2s" },
      ].map((w) => (
        <path
          key={w.delay}
          d={w.d}
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
          className="animate-steam opacity-0"
          style={{ animationDelay: w.delay, transformBox: "fill-box", transformOrigin: "bottom" }}
        />
      ))}
    </svg>
  );
}
