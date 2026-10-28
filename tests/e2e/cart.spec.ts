import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

const sheet = (page: Page) => page.getByRole("dialog", { name: /Masala Chai|Classic Vada Pav/ });

test.beforeEach(async ({ page }) => {
  await page.goto("/menu");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("a sized item needs a choice; the price updates live; the order survives a reload", async ({ page }) => {
  await page.getByRole("button", { name: "Add Masala Chai" }).click();
  const dialog = sheet(page);
  await expect(dialog).toBeVisible();
  const add = dialog.getByRole("button", { name: /^Add to order/ });
  await expect(add).toBeDisabled();
  await expect(dialog.getByText("Choose a size first.")).toBeVisible();

  await dialog.getByText("Regular", { exact: true }).click();
  await dialog.getByRole("button", { name: "Add one Masala Chai" }).click();
  await expect(add).toHaveText("Add to order · $10.98");
  await add.click();
  await expect(dialog).toBeHidden();

  await expect(page.getByRole("button", { name: "Your order, 2 items" })).toBeVisible();
  await expect(page.getByRole("button", { name: /View your order/ })).toContainText("$10.98");

  await page.goto("/visit"); // persists across pages and reloads
  await expect(page.getByRole("button", { name: "Your order, 2 items" })).toBeVisible();
});

test("plain items go straight in; the drawer edits quantities and links to checkout", async ({ page }) => {
  await page.getByRole("button", { name: "Add Water" }).click();
  await page.getByRole("button", { name: "Add Classic Bun Maska" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Added Classic Bun Maska" })).toBeAttached();

  await page.getByRole("button", { name: /View your order/ }).click();
  const drawer = page.getByRole("dialog", { name: "Your order" });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByText("Subtotal")).toBeVisible();
  await expect(drawer).toContainText("$8.49"); // 2.49 + 6.00

  await drawer.getByRole("button", { name: "Add one Water" }).click();
  await expect(drawer).toContainText("$10.98"); // 2 × 2.49 + 6.00
  await drawer.getByRole("button", { name: "Remove Classic Bun Maska" }).click();
  await expect(drawer).toContainText("$4.98");

  await expect(drawer.getByRole("link", { name: "Review order" })).toHaveAttribute("href", "/checkout");
  await expect(drawer.getByText(/show your order at the counter/)).toBeVisible();

  await drawer.getByRole("button", { name: "Clear order" }).click();
  await expect(drawer.getByText("Your order is empty.")).toBeVisible();
});

test("extras: up to 2 each, priced into the line", async ({ page }) => {
  await page.getByRole("button", { name: "Add Classic Vada Pav" }).click();
  const dialog = sheet(page);
  const more = dialog.getByRole("button", { name: "Add one Extra cheese" });
  await more.click();
  await more.click();
  await expect(more).toBeDisabled(); // max 2
  await expect(dialog.getByRole("button", { name: /^Add to order/ })).toHaveText("Add to order · $11.49"); // 7.49 + 2 × 2.00
});

test("the item sheet is accessible and closes with Escape, returning focus", async ({ page }) => {
  const trigger = page.getByRole("button", { name: "Add Masala Chai" });
  await trigger.click();
  await expect(sheet(page)).toBeVisible();
  const results = await new AxeBuilder({ page }).include("dialog[open]").withTags(WCAG).analyze();
  expect(results.violations).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(sheet(page)).toBeHidden();
  await expect(trigger).toBeFocused();
});
