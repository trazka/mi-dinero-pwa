import { expect, type Page } from "@playwright/test";
export async function chooseDate(page: Page, label: string, date: string) {
  await page.getByLabel(label, { exact: true }).click();
  const calendar = page.getByRole("dialog", {
    name: "Seleccionar fecha",
    exact: true,
  });
  await calendar
    .getByRole("button", { name: "Cambiar año", exact: true })
    .click();
  await calendar
    .getByRole("button", { name: date.slice(0, 4), exact: true })
    .click();
  await calendar
    .getByRole("button", { name: "Cambiar mes", exact: true })
    .click();
  await calendar
    .getByRole("button", {
      name: new Date(date + "T12:00:00").toLocaleDateString("es-MX", {
        month: "long",
      }),
      exact: true,
    })
    .click();
  await calendar.locator(`button[data-date="${date}"]`).click();
  await expect(calendar).toHaveCount(0);
}
