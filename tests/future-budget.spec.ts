import { test, expect } from "@playwright/test";
import { chooseDate } from "./date-utils";
import { setBackupFile } from "./backup-utils";
import { revealHomeSummary } from "./home-utils";

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date(2026, 10, 14, 12));
});

test("fecha futura avisa antes de guardar, se limpia al corregir y sigue afectando desde ahora", async ({
  page,
}) => {
  await page.goto("./");
  await page
    .getByRole("button", { name: "Nuevo movimiento", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Nuevo movimiento",
    exact: true,
  });
  await dialog.getByLabel("Tipo", { exact: true }).selectOption("income");
  await dialog.getByLabel("Importe (MXN)", { exact: true }).fill("1000");
  await dialog.getByLabel("Establecimiento o concepto").fill("Ingreso prueba");
  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
  await page
    .getByRole("button", { name: "Nuevo movimiento", exact: true })
    .click();
  await dialog.getByLabel("Importe (MXN)", { exact: true }).fill("300");
  await dialog.getByLabel("Establecimiento o concepto").fill("Gasto futuro");
  await expect(dialog.getByRole("status")).toHaveCount(0);
  await chooseDate(page, "Fecha", "2026-11-19");
  await expect(dialog.getByRole("status")).toContainText(
    "afectará tu saldo desde ahora",
  );
  await chooseDate(page, "Fecha", "2026-11-14");
  await expect(dialog.getByRole("status")).toHaveCount(0);
  await chooseDate(page, "Fecha", "2026-11-19");
  await dialog.getByLabel("Tipo", { exact: true }).selectOption("credit");
  await expect(dialog.getByRole("status")).toContainText("aumentará tu deuda");
  await dialog.getByLabel("Tipo", { exact: true }).selectOption("transfer");
  await expect(dialog.getByRole("status")).toContainText("Banco y Efectivo");
  await dialog.getByLabel("Tipo", { exact: true }).selectOption("expense");
  await dialog.getByLabel("Establecimiento o concepto").fill("Gasto futuro");
  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
  await revealHomeSummary(page);
  await expect(page.locator(".balance-number")).toContainText("$700.00");
  const nav = page.getByRole("navigation", { name: "Navegación principal" });
  await nav.getByRole("button", { name: "Movimientos", exact: true }).click();
  await page
    .getByRole("button", { name: "Editar Gasto futuro", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("status")).toContainText(
    "La fecha es futura",
  );
});

test("gasolina TDC consume Transporte una vez y el abono solo reduce dinero y deuda", async ({
  page,
}) => {
  await page.goto("./");
  const nav = page.getByRole("navigation", { name: "Navegación principal" });
  await nav.getByRole("button", { name: "Respaldos", exact: true }).click();
  page.once("dialog", (d) => d.accept());
  await setBackupFile(page, {
    name: "budget.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        version: 2,
        movements: [
          {
            id: "income",
            type: "income",
            date: "2026-11-14",
            amount: 1000,
            merchant: "Nómina",
            category: "Sueldo",
            method: "Transferencia",
            notes: "",
          },
          {
            id: "gas",
            type: "expense",
            date: "2026-11-14",
            amount: 800,
            merchant: "Gasolina",
            category: "Transporte",
            method: "Tarjeta de crédito",
            creditDebtId: "card",
            notes: "",
          },
        ],
        debts: [
          {
            id: "card",
            kind: "credit",
            creditor: "Mi TDC",
            original: 0,
            initialBalance: 0,
            due: "2026-12-05",
            payments: [],
            charges: [{ movementId: "gas", amount: 800 }],
          },
        ],
        budgets: [
          { month: "2026-11", category: "Transporte", limit: 2000 },
          { month: "2026-11", category: "", limit: 3000 },
        ],
      }),
    ),
  });
  await expect(page.getByRole("status")).toContainText("Datos guardados");
  await nav.getByRole("button", { name: "Inicio", exact: true }).click();
  await revealHomeSummary(page);
  await expect(page.locator(".balance-number")).toContainText("$1,000.00");
  await nav.getByRole("button", { name: "Reportes", exact: true }).click();
  const transport = page
    .locator(".planning-item")
    .filter({ hasText: "Transporte" });
  await expect(transport).toContainText("$800.00 de $2,000.00");
  await nav.getByRole("button", { name: "Deudas", exact: true }).click();
  await page
    .getByRole("button", { name: "Registrar abono", exact: true })
    .click();
  await page.getByLabel("Importe del abono (MXN)").fill("800");
  await chooseDate(page, "Fecha del abono", "2026-11-19");
  await expect(page.getByRole("dialog").getByRole("status")).toContainText(
    "reducirá la deuda desde ahora",
  );
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.locator(".debt-number")).toContainText("$0.00");
  await nav.getByRole("button", { name: "Reportes", exact: true }).click();
  await expect(transport).toContainText("$800.00 de $2,000.00");
  await expect(
    page.locator(".planning-item").filter({ hasText: "General" }),
  ).toContainText("$800.00 de $3,000.00");
  await expect(page.locator(".report-totals")).toContainText("$800.00");
  await page.reload();
  await revealHomeSummary(page);
  await expect(page.locator(".balance-number")).toContainText("$200.00");
});
