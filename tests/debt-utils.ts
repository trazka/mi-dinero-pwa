import { expect, type Page } from "@playwright/test";

export async function openDebts(page: Page) {
  await expect(page.locator(".page-preview-content h1")).toHaveCount(0);
  await expect(page.locator(".page .debt-toggle").first()).toBeVisible();
  const first = page.locator(".page .debt-detail").first();
  if (!(await first.evaluate((el) => el.hasAttribute("open")))) {
    await first.locator(":scope > .debt-toggle").click();
  }
}
