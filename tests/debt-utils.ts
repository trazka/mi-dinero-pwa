import { expect, type Page } from "@playwright/test";

export async function openDebts(page: Page) {
  await expect(page.locator(".page-preview-content h1")).toHaveCount(0);
  await expect(page.locator(".page .debt-toggle").first()).toBeVisible();
  for (const summary of await page
    .locator(".page .debt-detail:not([open]) > .debt-toggle")
    .all()) {
    await summary.click();
  }
}
