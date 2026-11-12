import { test, expect } from "@playwright/test";
import { setBackupFile } from "./backup-utils";
test("apartados ahorran sin gastos, conservan historial y viajan en respaldos offline", async ({
  page,
  context,
}) => {
  await page.goto("./");
  await page
    .getByRole("button", { name: "Nuevo movimiento", exact: true })
    .click();
  await page.getByLabel("Tipo", { exact: true }).selectOption("income");
  await page
    .getByLabel("Establecimiento o concepto", { exact: true })
    .fill("Ingreso para ahorro");
  await page.getByLabel("Importe (MXN)", { exact: true }).fill("1000");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const nav = page.getByRole("navigation", { name: "Navegación principal" });
  await nav.getByRole("button", { name: "Apartados", exact: true }).click();
  await page
    .getByRole("button", { name: "Nuevo apartado", exact: true })
    .click();
  await page.getByLabel("Nombre del apartado").fill("Emergencias");
  await page.getByLabel("Meta de ahorro (MXN)").fill("500");
  await page
    .getByRole("button", { name: "Guardar apartado", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Aportar a Emergencias", exact: true })
    .click();
  await page.getByLabel("Importe del apartado (MXN)").fill("300");
  await page
    .getByRole("button", { name: "Guardar apartado", exact: true })
    .click();
  await expect(page.getByLabel("Progreso de Emergencias")).toHaveAttribute(
    "value",
    "300",
  );
  await expect(
    page.getByRole("button", { name: "Eliminar Emergencias", exact: true }),
  ).toBeDisabled();
  await expect(page.locator(".report-totals")).toContainText("$700.00");
  await nav.getByRole("button", { name: "Inicio", exact: true }).click();
  await expect(page.locator(".balance-number")).toContainText("$1,000.00");
  await expect(page.locator(".savings-summary")).toContainText("$700.00");
  await nav.getByRole("button", { name: "Apartados", exact: true }).click();
  await page
    .getByRole("button", { name: "Editar Emergencias", exact: true })
    .click();
  await page.getByLabel("Nombre del apartado").fill("Fondo de emergencia");
  await page
    .getByRole("button", { name: "Guardar apartado", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Retirar de Fondo de emergencia",
      exact: true,
    })
    .click();
  await page.getByLabel("Importe del apartado (MXN)").fill("100");
  await page
    .getByRole("button", { name: "Guardar apartado", exact: true })
    .click();
  await expect(
    page.getByLabel("Progreso de Fondo de emergencia"),
  ).toHaveAttribute("value", "200");
  await nav.getByRole("button", { name: "Respaldos", exact: true }).click();
  const downloadEvent = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Exportar respaldo JSON", exact: true })
    .click();
  const path = await (await downloadEvent).path();
  page.once("dialog", (d) => d.accept());
  await setBackupFile(page, path!);
  await expect(page.getByRole("status")).toContainText("Datos guardados");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await context.setOffline(true);
  await page.reload();
  await nav.getByRole("button", { name: "Apartados", exact: true }).click();
  await expect(
    page.getByLabel("Progreso de Fondo de emergencia"),
  ).toHaveAttribute("value", "200");
  await page
    .getByText("Historial de Fondo de emergencia", { exact: true })
    .click();
  await expect(page.getByText(/Aportación · \$300.00/)).toBeVisible();
  await expect(page.getByText(/Retiro · \$100.00/)).toBeVisible();
  await page.screenshot({ path: "test-results/apartados-iphone.png" });
});
