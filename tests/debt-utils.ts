import { expect, type Page } from "@playwright/test";

export async function openDebts(page: Page) {
  await expect(page.locator(".page-preview-content h1")).toHaveCount(0);
  await expect(page.locator(".page .debt-toggle").first()).toBeVisible();
  const closed = page.locator(".page .debt-detail:not([open]) > .debt-toggle");
  while (await closed.count()) {
    await closed.first().click();
  }
}
