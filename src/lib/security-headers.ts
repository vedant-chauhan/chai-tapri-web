/**
 * Security headers and CSP baseline (SECURITY.md "Headers & platform", F4-6).
 *
 * Applied to every route through `headers()` in next.config.ts.
 *
 * Why no nonce-based CSP: Next.js nonces need Proxy (Node-only in Next 16, unsupported on
 * OpenNext Cloudflare) and force every page to render dynamically, which conflicts with the
 * cached menu pages (PHASE-4-FOUNDATION §3). So scripts are limited to our own origin, with
 * 'unsafe-inline' for Next's inline bootstrap scripts. React escaping and "no HTML rendering of
 * user text" remain the XSS controls. Revisit if Next ships hash-based CSP for App Router (SRI).
 *
 * Slice 1 adds Stripe origins (js.stripe.com, api.stripe.com, hooks.stripe.com) per Stripe's CSP guide.
 */

export interface SecurityHeaderOptions {
  /** `next dev` needs 'unsafe-eval' for React's debugging features. Never in production builds. */
  isDev: boolean;
}

export function contentSecurityPolicy({ isDev }: SecurityHeaderOptions): string {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'", ...(isDev ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:"],
    "font-src": ["'self'"],
    "connect-src": ["'self'"],
    "frame-src": ["'none'"],
    "worker-src": ["'self'"],
    "manifest-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };
  return Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(" ")}`)
    .join("; ");
}

export function securityHeaders(options: SecurityHeaderOptions): Array<{ key: string; value: string }> {
  return [
    { key: "Content-Security-Policy", value: contentSecurityPolicy(options) },
    // 2 years. `preload` only after the domain is stable (SECURITY.md). Browsers ignore HSTS on http://localhost.
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    // Legacy equivalent of frame-ancestors 'none' for old browsers.
    { key: "X-Frame-Options", value: "DENY" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), usb=(), browsing-topics=(), payment=(self)",
    },
  ];
}
