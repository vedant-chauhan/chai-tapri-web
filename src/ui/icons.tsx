// Inline SVG icons (no icon font, nothing loaded from third parties: CSP stays strict).

/** Instagram glyph (outline), drawn to Instagram's brand-resource proportions. */
export function InstagramIcon({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
      <circle cx="12" cy="12" r="4.25" />
      <circle cx="17.5" cy="6.5" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Instagram link shown as the logo; the accessible name says where it goes. */
export function InstagramLink({ url, handle, className = "" }: { url: string; handle: string; className?: string }) {
  return (
    <a
      href={url}
      aria-label={`Chai Tapri on Instagram (${handle})`}
      title={`Instagram ${handle}`}
      className={`inline-flex size-11 items-center justify-center rounded-full hover:opacity-80 ${className}`}
    >
      <InstagramIcon />
    </a>
  );
}
