import { describe, expect, it } from "vitest";
import { contentSecurityPolicy, securityHeaders } from "@/lib/security-headers";

const asMap = (isDev: boolean) => Object.fromEntries(securityHeaders({ isDev }).map((h) => [h.key, h.value]));

describe("security headers (SECURITY.md baseline)", () => {
  it("sends every baseline header", () => {
    expect(Object.keys(asMap(false)).sort()).toEqual(
      [
        "Content-Security-Policy",
        "Permissions-Policy",
        "Referrer-Policy",
        "Strict-Transport-Security",
        "X-Content-Type-Options",
        "X-Frame-Options",
      ].sort(),
    );
  });

  it("forbids framing, plugins and foreign form posts", () => {
    const csp = contentSecurityPolicy({ isDev: false });
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain("default-src 'self'");
  });

  it("allows 'unsafe-eval' only in development", () => {
    expect(contentSecurityPolicy({ isDev: false })).not.toContain("unsafe-eval");
    expect(contentSecurityPolicy({ isDev: true })).toContain("'unsafe-eval'");
  });

  it("allows third-party origins only as frames for the map (Stripe is added in slice 1)", () => {
    const csp = contentSecurityPolicy({ isDev: false });
    const withOrigins = csp.split("; ").filter((d) => /https?:\/\//.test(d));
    expect(withOrigins).toEqual(["frame-src https://www.openstreetmap.org"]);
  });

  it("HSTS is two years without preload; camera/mic/location are denied", () => {
    const h = asMap(false);
    expect(h["Strict-Transport-Security"]).toBe("max-age=63072000; includeSubDomains");
    expect(h["Permissions-Policy"]).toMatch(/camera=\(\).*microphone=\(\).*geolocation=\(\)/);
    expect(h["X-Content-Type-Options"]).toBe("nosniff");
    expect(h["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
  });
});
