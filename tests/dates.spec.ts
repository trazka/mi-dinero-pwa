import { test, expect } from "@playwright/test";
import { chooseDate } from "./date-utils";
test("tocar un día cierra el calendario y conserva la fecha del movimiento al guardar y recargar", async ({
  page,
}) => {
  await page.goto("./");
  await page
    .getByRole("button", { name: "Nuevo movimiento", exact: true })
    .click();
  await page.getByLabel("Importe (MXN)", { exact: true }).fill("50");
  await page.getByLabel("Establecimiento o concepto").fill("Fecha de prueba");
  await chooseDate(page, "Fecha", "2024-02-29");
  await expect(page.getByLabel("Fecha", { exact: true })).toContainText("29");
  await expect(
    page.getByRole("dialog", { name: "Nuevo movimiento", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await page.reload();
  await expect(page.locator(".movement-info")).toContainText("29 feb");
  await page.getByRole("button", { name: "Editar Fecha de prueba" }).click();
  await expect(page.getByLabel("Fecha", { exact: true })).toContainText("2024");
  await chooseDate(page, "Fecha", "2024-03-01");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.locator(".movement-info")).toContainText("1 mar");
  await expect(page.locator('input[type="date"]')).toHaveCount(0);
});
test("fechas de deuda y abono se seleccionan sin confirmación y filtros respetan el mínimo", async ({
  page,
}) => {
  const nav = page.getByRole("navigation", { name: "Navegación principal" });
  await page.goto("./");
  await expect(
    page.getByRole("button", { name: "Nuevo movimiento", exact: true }),
  ).toBeEnabled();
  await nav.getByRole("button", { name: "Deudas", exact: true }).click();
  await page.getByRole("button", { name: "Nueva deuda", exact: true }).click();
  await page.getByLabel("Acreedor", { exact: true }).fill("Acreedor ficticio");
  await page.getByLabel("Importe original (MXN)").fill("100");
  await page.getByLabel("Saldo pendiente actual (MXN)").fill("100");
  await chooseDate(page, "Fecha de vencimiento", "2027-03-15");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.locator(".debt-meta")).toContainText("15 mar");
  await page
    .getByRole("button", { name: "Registrar abono", exact: true })
    .click();
  await page.getByLabel("Importe del abono (MXN)").fill("25");
  await chooseDate(page, "Fecha del abono", "2027-02-01");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.locator(".debt-number")).toContainText("$75.00");
  await page.locator("summary").click();
  await expect(page.locator(".payment")).toContainText("1 feb");
  await nav.getByRole("button", { name: "Movimientos", exact: true }).click();
  await chooseDate(page, "Desde", "2027-02-01");
  await page.getByLabel("Hasta", { exact: true }).click();
  const calendar = page.getByRole("dialog", {
    name: "Seleccionar fecha",
    exact: true,
  });
  await calendar.getByLabel("Año", { exact: true }).selectOption("2027");
  await calendar.getByLabel("Mes", { exact: true }).selectOption("0");
  await expect(
    calendar.locator('button[data-date="2027-01-31"]'),
  ).toBeDisabled();
  await calendar.getByRole("button", { name: "Mes siguiente" }).click();
  await calendar.locator('button[data-date="2027-02-01"]').click();
  await expect(calendar).toHaveCount(0);
  await expect(page.locator(".movement")).toHaveCount(1);
  await page.getByLabel("Desde", { exact: true }).click();
  await page
    .getByRole("dialog", { name: "Seleccionar fecha" })
    .getByRole("button", { name: "Quitar fecha" })
    .click();
  await expect(page.getByLabel("Desde", { exact: true })).toContainText(
    "Elegir fecha",
  );
  await expect(
    page.getByRole("dialog", { name: "Seleccionar fecha" }),
  ).toHaveCount(0);
});
