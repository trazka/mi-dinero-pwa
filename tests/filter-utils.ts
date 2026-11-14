import { expect, type Page } from "@playwright/test";
export async function openAdvancedFilters(page: Page) {
  await expect(page.locator(".page-preview-content h1")).toHaveCount(0);
  const details = page.locator(".page .advanced-filters");
  if (!(await details.evaluate((el: HTMLDetailsElement) => el.open)))
    await details.locator("summary").click();
}
