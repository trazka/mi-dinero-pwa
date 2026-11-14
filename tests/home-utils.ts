import { expect, type Page } from "@playwright/test";
export async function revealHomeSummary(page: Page) {
  await expect(page.locator(".page h1")).toHaveText(
    /^(Tu espacio|Tu resumen)$/,
  );
  await expect(
    page.locator(".page .home-summary, .page .balance-number").first(),
  ).toBeVisible();
  const reveal = page.getByRole("button", {
    name: "Ver mi resumen",
    exact: true,
  });
  if (await reveal.isVisible()) await reveal.click();
}
