import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";

// R2 incremental cache (PHASE-4-FOUNDATION §3 "Menu caching"). On-demand revalidation by tag
// (menu changes in slice 1) will also need a tag cache; add it with the menu, not before.
export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
});
