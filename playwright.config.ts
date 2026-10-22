import { defineConfig, devices } from "@playwright/test";

/**
 * E2E (TESTING.md): mobile 390 px + desktop 1280 px.
 * Locally, runs against the real Workers build (OpenNext + `wrangler dev`), the runtime staging uses.
 * In CI against a preview deployment, set E2E_BASE_URL and no local server is started.
 */
const externalBaseUrl = process.env.E2E_BASE_URL;
const port = 8787;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: externalBaseUrl ?? `http://127.0.0.1:${port}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
  ],
  webServer: externalBaseUrl
    ? undefined
    : {
        command: `pnpm cf:build && pnpm exec wrangler dev --port ${port} --ip 127.0.0.1`,
        url: `http://127.0.0.1:${port}/`,
        reuseExistingServer: !process.env.CI,
        timeout: 300_000,
        env: { WRANGLER_SEND_METRICS: "false", NEXT_TELEMETRY_DISABLED: "1" },
      },
});
