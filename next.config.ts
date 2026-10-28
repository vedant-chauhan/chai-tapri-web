import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import { securityHeaders } from "./src/lib/security-headers";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  // Cache Components (and Partial Prefetching, which builds on it) are off: with them on, every page hangs
  // in the Workers runtime (OpenNext Cloudflare 1.20.12 + Next 16.4.2, checked 22 Oct 2026). Revisit when
  // OpenNext supports them. Caching uses the classic model (revalidate / revalidateTag) instead.
  cacheComponents: false,
  poweredByHeader: false,
  experimental: {
    // Builds must reflect the source exactly. Turbopack's on-disk build cache served a stale
    // globals.css (old colour tokens) after a change (24 Oct 2026). CI builds are clean anyway;
    // this keeps local builds and E2E honest. The dev server keeps its cache.
    turbopackFileSystemCacheForBuild: false,
  },
  images: {
    // No paid image service (ADR-0010): photos are pre-resized by `pnpm images` and a custom loader picks the width.
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
    // srcset widths = the variants `pnpm images` produces (src/lib/image-variants.ts).
    deviceSizes: [360, 720, 1080, 1440],
    imageSizes: [180],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders({ isDev }) }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

// Gives `next dev` access to Cloudflare bindings (R2, vars, .dev.vars) via getCloudflareContext().
if (isDev) {
  void initOpenNextCloudflareForDev();
}
