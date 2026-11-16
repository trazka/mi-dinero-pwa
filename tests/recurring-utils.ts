import { expect, type Page } from "@playwright/test";
export async function openRecurrents(page: Page) {
  await expect(page.locator(".page-preview-content h1")).toHaveCount(0);
  const toggle = page.locator(".page .recurring-toggle");
  if ((await toggle.getAttribute("aria-expanded")) === "false")
    await toggle.click();
}
