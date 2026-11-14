import { expect, type Page } from "@playwright/test";
export async function revealHomeSummary(page: Page) {
  await expect(
    page.locator(".home-summary, .balance-number").first(),
  ).toBeVisible();
  const reveal = page.getByRole("button", {
    name: "Ver mi resumen",
    exact: true,
  });
  if (await reveal.isVisible()) await reveal.click();
}
