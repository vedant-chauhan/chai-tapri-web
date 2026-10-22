import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  // Cache Components (and Partial Prefetching, which builds on it) are off: with them on, every page hangs
  // in the Workers runtime (OpenNext Cloudflare 1.20.12 + Next 16.4.2, checked 22 Oct 2026). Revisit when
  // OpenNext supports them. Caching uses the classic model (revalidate / revalidateTag) instead.
  cacheComponents: false,
  poweredByHeader: false,
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
