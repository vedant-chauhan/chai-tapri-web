import { test as base, expect } from "@playwright/test";

/**
 * Every E2E test runs offline from third parties: the embedded map (OpenStreetMap) and the
 * franchise form (Google Forms) are replaced by a stub page, so tests are deterministic and never
 * depend on someone else's uptime.
 */
export const test = base.extend({
  page: async ({ page }, provide) => {
    await page.route(/^https:\/\/(www\.openstreetmap\.org|docs\.google\.com)\//, (route) =>
      route.fulfill({ contentType: "text/html", body: "<!doctype html><title>stub</title><p>third-party frame</p>" }),
    );
    await provide(page);
  },
});

export { expect };
