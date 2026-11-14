import { expect, type Page } from "@playwright/test";

export async function selectAllMovements(page: Page) {
  await expect(page.locator(".page h1")).toHaveText("Movimientos");
  await expect(page.locator(".page-preview-content h1")).toHaveCount(0);
  const tabs = page.getByRole("tablist", { name: "Mostrar movimientos" });
  if (!(await tabs.locator('[aria-selected="true"]').count()))
    await tabs.getByRole("tab", { name: "Todos", exact: true }).click();
}
