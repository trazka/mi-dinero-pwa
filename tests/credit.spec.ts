import { test, expect } from "@playwright/test";
test("compra a crédito solo aumenta deuda; el abono registra el gasto y persiste al importar", async ({
  page,
}) => {
  const nav = page.getByRole("navigation", { name: "Navegación principal" });
  await page.goto("./");
  await expect(
    page.getByRole("button", { name: "Nuevo movimiento", exact: true }),
  ).toBeEnabled();
  await nav.getByRole("button", { name: "Deudas", exact: true }).click();
  await page.getByRole("button", { name: "Nueva deuda", exact: true }).click();
  await page.getByLabel("Tipo de deuda").selectOption("credit");
  await page.getByLabel("Acreedor", { exact: true }).fill("Tarjeta ficticia");
  await page.getByLabel("Importe original (MXN)").fill("0");
  await page.getByLabel("Saldo pendiente actual (MXN)").fill("0");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.locator(".debt-number")).toHaveText("$0.00");
  await nav.getByRole("button", { name: "Movimientos", exact: true }).click();
  await page
    .getByRole("button", { name: "Nuevo movimiento", exact: true })
    .click();
  await page.getByLabel("Importe (MXN)", { exact: true }).fill("100");
  await page.getByLabel("Establecimiento o concepto").fill("Compra ficticia");
  await page.getByLabel("Método de pago").selectOption("Tarjeta de crédito");
  await page
    .getByLabel("Tarjeta o deuda vinculada")
    .selectOption({ label: "Tarjeta ficticia · $0.00" });
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await nav.getByRole("button", { name: "Deudas", exact: true }).click();
  await expect(page.locator(".debt-number")).toHaveText("$100.00");
  await nav.getByRole("button", { name: "Inicio", exact: true }).click();
  await expect(page.locator(".balance-number")).toContainText("$0.00");
  await expect(
    page.locator(".stat").filter({ hasText: "Egresos" }),
  ).toContainText("$0.00");
  await nav.getByRole("button", { name: "Deudas", exact: true }).click();
  await page
    .getByRole("button", { name: "Registrar abono", exact: true })
    .click();
  await page.getByLabel("Importe del abono (MXN)").fill("40");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.locator(".debt-number")).toHaveText("$60.00");
  await page.reload();
  await expect(page.locator(".balance-number")).toContainText("-$40.00");
  await expect(
    page.locator(".stat").filter({ hasText: "Egresos" }),
  ).toContainText("$40.00");
  await nav.getByRole("button", { name: "Reportes", exact: true }).click();
  await expect(page.locator(".report-totals")).toContainText("$40.00");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.locator("tbody")).toContainText("$40.00");
  await nav.getByRole("button", { name: "Respaldos", exact: true }).click();
  const downloadEvent = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Exportar respaldo JSON", exact: true })
    .click();
  const file = await (await downloadEvent).path();
  page.once("dialog", (d) => d.accept());
  await page.locator("input[type=file]").setInputFiles(file!);
  await expect(page.getByRole("status")).toContainText("Datos guardados");
  await nav.getByRole("button", { name: "Deudas", exact: true }).click();
  await expect(page.locator(".debt-number")).toHaveText("$60.00");
  await nav.getByRole("button", { name: "Movimientos", exact: true }).click();
  await expect(page.locator(".movement")).toHaveCount(2);
  await expect(
    page.getByText("Abono de tarjeta · Cuenta como gasto"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Editar Compra ficticia" }).click();
  await page.getByLabel("Importe (MXN)", { exact: true }).fill("20");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "revierte los abonos",
  );
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page.getByRole("button", { name: "Editar Compra ficticia" }).click();
  await page.getByLabel("Importe (MXN)", { exact: true }).fill("120");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await nav.getByRole("button", { name: "Deudas", exact: true }).click();
  await expect(page.locator(".debt-number")).toHaveText("$80.00");
  await page.locator("summary").click();
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Revertir abono de Tarjeta ficticia" })
    .click();
  await expect(page.locator(".debt-number")).toHaveText("$120.00");
  await nav.getByRole("button", { name: "Inicio", exact: true }).click();
  await expect(page.locator(".balance-number")).toContainText("$0.00");
  await nav.getByRole("button", { name: "Movimientos", exact: true }).click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Eliminar Compra ficticia" }).click();
  await expect(page.locator(".movement")).toHaveCount(0);
  await nav.getByRole("button", { name: "Deudas", exact: true }).click();
  await expect(page.locator(".debt-number")).toHaveText("$0.00");
});
