import { expect, type Page } from "@playwright/test";
export async function chooseDate(page: Page, label: string, date: string) {
  await page.getByLabel(label, { exact: true }).click();
  const calendar = page.getByRole("dialog", {
    name: "Seleccionar fecha",
    exact: true,
  });
  await calendar
    .getByLabel("Año", { exact: true })
    .selectOption(date.slice(0, 4));
  await calendar
    .getByLabel("Mes", { exact: true })
    .selectOption(String(Number(date.slice(5, 7)) - 1));
  await calendar.locator(`button[data-date="${date}"]`).click();
  await expect(calendar).toHaveCount(0);
}
