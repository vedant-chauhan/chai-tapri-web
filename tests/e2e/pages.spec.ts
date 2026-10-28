import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "./fixtures";

const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const PAGES = [
  { path: "/", h1: /Cutting chai & Mumbai street snacks/ },
  { path: "/menu", h1: "Menu" },
  { path: "/visit", h1: "Visit" },
];

for (const { path, h1 } of PAGES) {
  test.describe(`page ${path}`, () => {
    test("renders with header, footer and no axe violations", async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1, name: h1 })).toBeVisible();
      await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
      await expect(page.getByRole("contentinfo")).toContainText("Shop 6/189 William St");
      const results = await new AxeBuilder({ page }).exclude("iframe").withTags(WCAG).analyze();
      expect(results.violations).toEqual([]);
    });
  });
}

test("the status chip settles on a real state, never stays on 'Checking'", async ({ page }) => {
  // E2E runs the Workers build without a database: the chip must fall back to an honest message.
  await page.goto("/");
  const chip = page.locator("header [aria-live]");
  await expect(chip).not.toHaveText(/Checking/);
  await expect(chip).toHaveText(/Open ·|Closed|paused|unavailable|Can't confirm/);
});

test("menu lists all 11 categories with prices, and category links jump to them", async ({ page }) => {
  await page.goto("/menu");
  const categories = page.getByRole("navigation", { name: "Menu categories" }).getByRole("link");
  await expect(categories).toHaveCount(11);
  await expect(page.getByRole("main").getByRole("heading", { level: 2 })).toHaveCount(11);
  await expect(page.getByText("Cutting $4.49").first()).toBeVisible();
  await page.getByRole("link", { name: "Tapri Combos" }).click();
  await expect(page).toHaveURL(/#combos$/);
  await expect(page.getByText("Cutting Chai + Samosa")).toBeInViewport();
});

test("visit shows contact links and an hours section", async ({ page }) => {
  await page.goto("/visit");
  await expect(page.getByRole("link", { name: "0481 257 595" }).first()).toHaveAttribute("href", "tel:+61481257595");
  await expect(page.getByRole("link", { name: "@chaitapri.perth" }).first()).toHaveAttribute(
    "href",
    "https://www.instagram.com/chaitapri.perth/",
  );
  await expect(page.getByRole("heading", { name: "Opening hours" })).toBeVisible();
});

test("skip link moves focus to the main content", async ({ page }) => {
  await page.goto("/menu");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await skip.press("Enter");
  await expect(page).toHaveURL(/#main$/);
});

test("unknown pages get the styled 404", async ({ page }) => {
  const response = await page.goto("/no-such-page");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "This page doesn't exist" })).toBeVisible();
});

test("header stays at the top while scrolling, on its own light background", async ({ page }) => {
  await page.goto("/menu");
  const header = page.locator("#site-header");
  await page.mouse.wheel(0, 2500);
  await expect(async () => {
    const box = await header.boundingBox();
    expect(box?.y).toBe(0);
  }).toPass();
  await expect(page.getByRole("link", { name: "Chai Tapri home" })).toBeInViewport();
  const [headerBg, pageBg] = await Promise.all([
    header.evaluate((el) => getComputedStyle(el).backgroundColor),
    page.evaluate(() => getComputedStyle(document.body).backgroundColor),
  ]);
  expect(headerBg).not.toBe(pageBg);
  expect(headerBg).not.toBe("rgba(0, 0, 0, 0)");
});

test("category links glide to the section, below the sticky bars, and focus its heading", async ({ page }) => {
  await page.goto("/menu");
  await page.getByRole("navigation", { name: "Menu categories" }).getByRole("link", { name: "Samosa Corner" }).click();
  await expect(page).toHaveURL(/#samosa$/);
  await expect(page.getByRole("heading", { name: "Samosa Corner" })).toBeFocused();
  const barBottom = await page
    .getByRole("navigation", { name: "Menu categories" })
    .evaluate((el) => el.getBoundingClientRect().bottom);
  const sectionTop = await page.locator("#samosa").evaluate((el) => el.getBoundingClientRect().top);
  expect(sectionTop).toBeGreaterThanOrEqual(barBottom); // not hidden under the bars
  expect(sectionTop - barBottom).toBeLessThan(40);
  await expect(page.getByRole("link", { name: "Samosa Corner", exact: true })).toHaveAttribute("aria-current", "true");
});

test("Instagram is shown as its logo with an accessible name", async ({ page }) => {
  await page.goto("/");
  const insta = page.getByRole("contentinfo").getByRole("link", { name: /Instagram/ });
  await expect(insta).toHaveAttribute("href", "https://www.instagram.com/chaitapri.perth/");
  await expect(insta).toHaveAccessibleName("Chai Tapri on Instagram (@chaitapri.perth)");
  await expect(insta.locator("svg")).toBeVisible();
  await expect(insta).not.toContainText("Instagram");
});

test("menu photos load from the Workers build (20 items, small variants, none broken)", async ({ page }) => {
  await page.goto("/menu");
  const photos = page.getByRole("main").locator("img");
  await expect(photos).toHaveCount(20);
  for (const img of await photos.all()) {
    await img.scrollIntoViewIfNeeded();
    await expect(img).toHaveJSProperty("complete", true);
    expect(await img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
    expect(await img.getAttribute("alt")).toBe(""); // decorative: the name is next to it
  }
  const src = await photos.first().evaluate((el: HTMLImageElement) => el.currentSrc);
  expect(src).toMatch(/\/menu\/masala-chai-(360|720)\.webp$/);
  const res = await page.request.get(src);
  expect(res.headers()["content-type"]).toBe("image/webp");
});

test("home: playful sections, door sign and add-to-order from the photo signs", async ({ page }) => {
  await page.goto("/");
  for (const name of ["Chai 101", "Start here", "Up late?"]) {
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  }
  await expect(page.getByRole("heading", { name: "Cutting", exact: true })).toBeVisible();
  // The door sign settles on a state from the live status (or the fallback without a database).
  await expect(page.locator(".animate-swing")).toHaveText(/OPEN|CLOSED|BACK SOON|CHAI/);
  await page.evaluate(() => localStorage.clear());
  await page.getByRole("button", { name: "Add Classic Bun Maska" }).click();
  await expect(page.getByRole("button", { name: "Your order, 1 item" })).toBeVisible();
});

test("animations stop for people who prefer reduced motion", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/");
  const duration = await page.locator(".animate-marquee").evaluate((el) => getComputedStyle(el).animationDuration);
  expect(parseFloat(duration)).toBeLessThan(0.001);
  await context.close();
});

test("the logo is in the header (as the home link), in the footer, and as the tab icon", async ({ page }) => {
  await page.goto("/");
  const home = page.getByRole("link", { name: "Chai Tapri home" });
  await expect(home.locator("img")).toHaveCount(2);
  for (const img of await page.locator('img[src^="/brand/"]').all()) {
    expect(await img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
  }
  await expect(page.getByRole("contentinfo").getByRole("img", { name: "Chai Tapri, Northbridge" })).toBeVisible();
  const icon = await page.locator('link[rel="icon"]').getAttribute("href");
  expect(icon).toMatch(/^\/icon\.png/);
  expect((await page.request.get(icon!)).headers()["content-type"]).toBe("image/png");
});

test("visit shows an embedded map pinned on the shop, allowed by the CSP", async ({ page }) => {
  const response = await page.goto("/visit");
  const map = page.locator('iframe[title^="Map showing Chai Tapri"]');
  await expect(map).toHaveAttribute("src", /openstreetmap\.org\/export\/embed\.html.*marker=-31\.94923,115\.85867/);
  await expect(map).toHaveAttribute("loading", "lazy");
  expect(response?.headers()["content-security-policy"]).toContain("frame-src https://www.openstreetmap.org");
  await expect(page.getByRole("link", { name: "OpenStreetMap contributors" })).toBeVisible();
});

test("checkout: reviews the order with pickup details; payment is clearly 'coming soon'", async ({ page }) => {
  await page.goto("/checkout");
  await expect(page.getByText("Nothing here yet")).toBeVisible();
  await page.evaluate(() =>
    localStorage.setItem(
      "chai-tapri:cart:v1",
      JSON.stringify([
        { itemSlug: "masala-chai", choice: "Cutting", extras: {}, quantity: 2 },
        { itemSlug: "classic-vada-pav", choice: null, extras: { "Extra cheese": 1 }, quantity: 1 },
      ]),
    ),
  );
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Your order" })).toBeVisible();
  const main = page.locator("#main"); // the (closed) cart drawer holds the same lines
  await expect(main.getByText("Extra cheese", { exact: true })).toBeVisible();
  await expect(main.getByText("$18.47")).toBeVisible(); // 2 × 4.49 + (7.49 + 2.00)
  await expect(page.getByRole("button", { name: "Pay online · coming soon" })).toHaveAttribute("aria-disabled", "true");
  await expect(page.getByRole("heading", { name: "Pickup" })).toBeVisible();
  await expect(page.getByRole("button", { name: /View your order/ })).toHaveCount(0); // no floating bar here
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  const results = await new AxeBuilder({ page })
    .exclude("iframe")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});

test("the cart drawer leads to the checkout page", async ({ page }) => {
  await page.goto("/menu");
  await page.getByRole("button", { name: "Add Water" }).click();
  await page.getByRole("button", { name: /View your order/ }).click();
  await page.getByRole("link", { name: "Review order" }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.locator("#main").getByRole("button", { name: "Remove Water" })).toBeVisible();
});

test("franchise page: facts, steps, form slot with contact fallback, and the legal note", async ({ page }) => {
  await page.goto("/franchise");
  await expect(page.getByRole("heading", { level: 1, name: "Bring a tapri to your street" })).toBeVisible();
  for (const name of ["Why Chai Tapri", "How it works", "Register your interest"]) {
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  }
  await expect(page.getByText("4.6 stars from 197 Google reviews (October 2026).")).toBeVisible();
  await expect(page.getByText("Enquiry form coming soon")).toBeVisible();
  await expect(page.getByText(/Franchising Code of Conduct/)).toBeVisible();
  await page.getByRole("link", { name: "Register your interest" }).click();
  await expect(page).toHaveURL(/#enquire$/);
  const results = await new AxeBuilder({ page })
    .exclude("iframe")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
  await expect(page.getByRole("contentinfo").getByRole("link", { name: "Franchise with us" })).toBeVisible();
});
