import AxeBuilder from "@axe-core/playwright";
import fixture from "../fixtures/google-place-details.json";
import { expect, test } from "./fixtures";

test("Google reviews load on tap, with attribution, rating and links", async ({ page }) => {
  await page.route("**/api/v1/reviews/status", (route) => route.fulfill({ json: { configured: true } }));
  // Stand in for our endpoint with the shape it returns (the real Google call is unit-tested).
  await page.route("**/api/v1/reviews", (route) =>
    route.fulfill({
      json: {
        rating: fixture.rating,
        userRatingCount: fixture.userRatingCount,
        googleMapsUri: fixture.googleMapsUri,
        writeReviewUri: "https://search.google.com/local/writereview?placeid=ChIJTestPlaceId123",
        reviews: [
          {
            author: "Test Reviewer A",
            authorUri: "https://www.google.com/maps/contrib/1",
            rating: 5,
            relativeTime: "2 weeks ago",
            publishTime: null,
            text: "Test review one: lovely cutting chai.",
            reviewUri: null,
          },
          {
            author: "Test Reviewer B",
            authorUri: null,
            rating: 4,
            relativeTime: "a month ago",
            publishTime: null,
            text: "Test review two.",
            reviewUri: null,
          },
        ],
      },
    }),
  );
  await page.goto("/");
  const section = page.locator("section[aria-labelledby='reviews']");
  await expect(section.getByText(/from 197 Google reviews \(October 2026\)/)).toBeVisible();
  await section.getByRole("button", { name: "Show Google reviews" }).click();

  await expect(section.getByRole("link", { name: "Test Reviewer A" })).toHaveAttribute(
    "href",
    "https://www.google.com/maps/contrib/1",
  );
  await expect(section.getByText("Test Reviewer B")).toBeVisible();
  await expect(section.getByRole("img", { name: "5 out of 5 stars" })).toBeVisible();
  await expect(section.getByText("214 reviews on Google")).toBeVisible();
  await expect(section.getByText(/selected by Google/)).toBeVisible();
  await expect(section.getByRole("link", { name: "Leave a review" })).toHaveAttribute("href", /writereview\?placeid=/);
  await expect(section.getByRole("button", { name: "Show Google reviews" })).toHaveCount(0);

  const results = await new AxeBuilder({ page })
    .include("section[aria-labelledby='reviews']")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});

test("without a Google key: no button, just the verified rating and a link to Google", async ({ page }) => {
  await page.goto("/");
  const section = page.locator("section[aria-labelledby='reviews']");
  await expect(section.getByText(/from 197 Google reviews \(October 2026\)/)).toBeVisible();
  await expect(section.getByRole("link", { name: "Read all reviews on Google" })).toBeVisible();
  // The status check has answered "not configured", so the button never appears.
  await page.waitForResponse("**/api/v1/reviews/status").catch(() => {});
  await expect(section.getByRole("button", { name: "Show Google reviews" })).toHaveCount(0);
});

test("if Google fails after a key is configured, the section explains and links to Google", async ({ page }) => {
  await page.route("**/api/v1/reviews/status", (route) => route.fulfill({ json: { configured: true } }));
  await page.goto("/"); // the real /api/v1/reviews has no key in E2E, so it answers 503
  const section = page.locator("section[aria-labelledby='reviews']");
  await section.getByRole("button", { name: "Show Google reviews" }).click();
  await expect(section.getByText("Google reviews can't be loaded right now.")).toBeVisible();
  await expect(section.getByRole("link", { name: "Read them on Google" })).toBeVisible();
});
