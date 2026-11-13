import type { Page } from "@playwright/test";
export async function openAdvancedFilters(page: Page) {
  const details = page.locator(".advanced-filters");
  if (!(await details.evaluate((el: HTMLDetailsElement) => el.open)))
    await details.locator("summary").click();
}
