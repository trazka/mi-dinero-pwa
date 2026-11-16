import { expect, type Page } from "@playwright/test";

export async function openReportFilters(page: Page) {
  await expect(page.locator(".page-preview-content h1")).toHaveCount(0);
  const filters = page.locator(".page .report-filters");
  if (!(await filters.evaluate((el) => el.hasAttribute("open")))) {
    await filters.locator(":scope > summary").click();
  }
}
export async function openBudget(page: Page) {
  await expect(page.locator(".page-preview-content h1")).toHaveCount(0);
  const budget = page.locator(".page .report-budget");
  if (!(await budget.evaluate((el) => el.hasAttribute("open")))) {
    await budget.locator(":scope > summary").click();
  }
}
