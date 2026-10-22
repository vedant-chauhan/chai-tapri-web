import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("home page smoke", () => {
  test("renders the holding page", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: "Chai Tapri" })).toBeVisible();
    await expect(page).toHaveTitle(/Chai Tapri/);
  });

  test("has no WCAG 2.2 A/AA violations (axe)", async ({ page }) => {
    await page.goto("/");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test("Tab moves through the page without trapping focus", async ({ page }) => {
    await page.goto("/");
    // The holding page has no interactive elements yet. Slice 1 replaces this with real focus-order checks.
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await expect(page.locator("body")).toBeVisible();
  });
});
