import { expect, type Page } from "@playwright/test";
export async function openSidebar(page: Page) {
  const toggle = page.locator(".sidebar-toggle");
  await expect(toggle).toBeVisible();
  if ((await toggle.getAttribute("aria-expanded")) === "false")
    await toggle.click();
  await expect(page.locator(".sidebar")).toBeVisible();
}
