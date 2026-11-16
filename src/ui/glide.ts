const SCROLL_MS = 350;
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Scrolls to `y` over SCROLL_MS (instantly if the user prefers reduced motion). */
export function glideTo(y: number, onDone: () => void = () => {}) {
  const start = window.scrollY;
  const distance = y - start;
  if (prefersReducedMotion() || Math.abs(distance) < 2) {
    window.scrollTo(0, y);
    onDone();
    return;
  }
  const t0 = performance.now();
  const step = (now: number) => {
    const t = Math.min(1, (now - t0) / SCROLL_MS);
    window.scrollTo(0, start + distance * easeInOutCubic(t));
    if (t < 1) requestAnimationFrame(step);
    else onDone();
  };
  requestAnimationFrame(step);
}
