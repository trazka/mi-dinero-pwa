import { enableSavingsPrivacy } from "./savings-privacy-utils";
import { test, expect } from "@playwright/test";
import { setBackupFile } from "./backup-utils";
test("apartados ahorran sin gastos, conservan historial y viajan en respaldos offline", async ({
  page,
  context,
}) => {
  await page.goto("./");
  await enableSavingsPrivacy(page, context);
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
  await page
    .getByRole("button", {
      name: "Desbloquear con el dispositivo",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Mostrar ahorros", exact: true })
    .click();
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

test("Nuevo movimiento ofrece Apartado, conserva la fecha y no crea gastos", async ({
  page,
  context,
}) => {
  await page.goto("./");
  await enableSavingsPrivacy(page, context);
  const nav = page.getByRole("navigation", { name: "Navegación principal" });
  await nav.getByRole("button", { name: "Respaldos", exact: true }).click();
  page.once("dialog", (d) => d.accept());
  await setBackupFile(page, {
    name: "saving.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        version: 2,
        debts: [],
        movements: [
          {
            id: "income",
            type: "income",
            date: "2026-11-01",
            merchant: "Ingreso de prueba",
            category: "Sueldo",
            amount: 1000,
            method: "Efectivo",
            notes: "",
          },
        ],
        savings: [
          { id: "goal", name: "Vacaciones", target: 2000, entries: [] },
        ],
      }),
    ),
  });
  await expect(page.getByRole("status")).toContainText("Datos guardados");
  await nav.getByRole("button", { name: "Movimientos", exact: true }).click();
  await page
    .getByRole("button", { name: "Nuevo movimiento", exact: true })
    .click();
  await page.getByLabel("Tipo", { exact: true }).selectOption("saving");
  await expect(
    page.getByLabel("Apartado de ahorro", { exact: true }),
  ).toHaveValue("goal");
  await expect(
    page.getByLabel("Establecimiento o concepto", { exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("Importe (MXN)", { exact: true }).fill("1200");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "dinero libre",
  );
  await page.getByLabel("Importe (MXN)", { exact: true }).fill("250");
  await page.getByLabel("Fecha", { exact: true }).click();
  await page.getByRole("button", { name: "Hoy", exact: true }).click();
  const selectedDate = await page.locator('input[name="date"]').inputValue();
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".movement")).toHaveCount(1);
  await nav.getByRole("button", { name: "Apartados", exact: true }).click();
  await expect(page.getByLabel("Progreso de Vacaciones")).toHaveAttribute(
    "value",
    "250",
  );
  await page.getByText("Historial de Vacaciones", { exact: true }).click();
  await expect(
    page.getByText(`${selectedDate} · Aportación · $250.00`, { exact: true }),
  ).toBeVisible();
  await nav.getByRole("button", { name: "Inicio", exact: true }).click();
  await expect(page.locator(".balance-number")).toContainText("$1,000.00");
  await expect(page.locator(".savings-summary")).toContainText("$750.00");
});

test("Nuevo movimiento permite crear un apartado cuando no hay metas", async ({
  page,
  context,
}) => {
  await page.goto("./");
  await enableSavingsPrivacy(page, context);
  await page
    .getByRole("button", { name: "Nuevo movimiento", exact: true })
    .click();
  await page.getByLabel("Tipo", { exact: true }).selectOption("saving");
  await page
    .getByRole("button", { name: "Crear apartado", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".page h1")).toHaveText("Apartados");
  await expect(page.getByLabel("Nombre del apartado")).toBeVisible();
});
