import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "./fixtures";

test.describe("home page smoke", () => {
  test("renders the home page", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("link", { name: "Chai Tapri home" })).toBeVisible();
    await expect(page).toHaveTitle(/Chai Tapri/);
  });

  test("has no WCAG 2.2 A/AA violations (axe)", async ({ page }) => {
    await page.goto("/");
    const results = await new AxeBuilder({ page })
      .exclude("iframe")
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test("sends the security headers baseline", async ({ request }) => {
    const response = await request.get("/");
    const headers = response.headers();
    expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(headers["content-security-policy"]).not.toContain("unsafe-eval");
    expect(headers["strict-transport-security"]).toContain("max-age=63072000");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["permissions-policy"]).toContain("camera=()");
    expect(headers["x-powered-by"]).toBeUndefined();
  });

  test("Tab reaches the skip link, then the header links in order", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Chai Tapri home" })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Menu" })).toBeFocused();
  });
});
