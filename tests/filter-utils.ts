import { expect, type Page } from "@playwright/test";
export async function openAdvancedFilters(page: Page) {
  await expect(page.locator(".page-preview-content h1")).toHaveCount(0);
  await openMovementFilters(page);
  const details = page.locator(".page .advanced-filters");
  if (!(await details.evaluate((el: HTMLDetailsElement) => el.open)))
    await details.locator("summary").click();
}

export async function openMovementFilters(page: Page) {
  await expect(page.locator(".page-preview-content h1")).toHaveCount(0);
  const details = page.locator(".page .movement-filters");
  if (
    (await details.count()) &&
    !(await details.evaluate((el) => el.hasAttribute("open")))
  ) {
    await details.locator(":scope > summary").click();
  }
}
