import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "./fixtures";

const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

test.describe("staff area guard (no session)", () => {
  for (const path of ["/admin", "/admin/security/two-factor"]) {
    test(`anonymous ${path} → sign-in`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/admin\/sign-in$/);
      await expect(page.getByRole("heading", { level: 1, name: "Staff sign-in" })).toBeVisible();
    });
  }

  test("staff pages are not indexed", async ({ page }) => {
    await page.goto("/admin/sign-in");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });
});

test.describe("sign-in screens", () => {
  test("sign-in form is labelled and passes axe", async ({ page }) => {
    await page.goto("/admin/sign-in");
    await expect(page.getByLabel("Email")).toHaveAttribute("autocomplete", "username");
    await expect(page.getByLabel("Password")).toHaveAttribute("autocomplete", "current-password");
    const results = await new AxeBuilder({ page }).exclude("iframe").withTags(WCAG).analyze();
    expect(results.violations).toEqual([]);
  });

  test("sign-in is keyboard operable", async ({ page }) => {
    await page.goto("/admin/sign-in");
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Email")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Password")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Sign in" })).toBeFocused();
  });

  test("empty submit shows an announced error", async ({ page }) => {
    await page.goto("/admin/sign-in");
    await page.getByRole("button", { name: "Sign in" }).click();
    // Scoped to the form: Next.js also renders a (empty) role="alert" route announcer.
    await expect(page.locator("form").getByRole("alert")).toHaveText("Enter your email and password.");
  });

  test("code screen passes axe", async ({ page }) => {
    await page.goto("/admin/sign-in/verify");
    await expect(page.getByLabel("6-digit code")).toHaveAttribute("autocomplete", "one-time-code");
    const results = await new AxeBuilder({ page }).exclude("iframe").withTags(WCAG).analyze();
    expect(results.violations).toEqual([]);
  });
});
