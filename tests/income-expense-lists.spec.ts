import { openAdvancedFilters } from "./filter-utils";
import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { setBackupFile } from "./backup-utils";
import { chooseDate } from "./date-utils";

test("tarjetas de Inicio separan ingresos y egresos, filtran fechas y exportan sin mezclar", async ({
  page,
}) => {
  await page.goto("./");
  const nav = page.getByRole("navigation", { name: "Navegación principal" });
  await nav.getByRole("button", { name: "Respaldos", exact: true }).click();
  const base = {
    type: "expense",
    category: "Alimentación",
    method: "Efectivo",
    notes: "",
  };
  const movements = [
    {
      ...base,
      id: "income1",
      type: "income",
      date: "2026-11-01",
      merchant: "Ingreso antiguo",
      amount: 500,
    },
    {
      ...base,
      id: "expense1",
      date: "2026-11-01",
      merchant: "Gasto antiguo",
      amount: 20,
    },
    {
      ...base,
      id: "income2",
      type: "income",
      date: "2026-11-12",
      merchant: "Ingreso reciente",
      amount: 600,
    },
    {
      ...base,
      id: "expense2",
      date: "2026-11-12",
      merchant: "Gasto reciente",
      amount: 30,
    },
    {
      ...base,
      id: "purchase",
      date: "2026-11-12",
      merchant: "Compra pendiente",
      amount: 100,
      method: "Tarjeta de crédito",
      creditDebtId: "card",
    },
    {
      ...base,
      id: "payment",
      date: "2026-11-12",
      merchant: "Pago de tarjeta",
      amount: 40,
      method: "Transferencia",
      category: "Pago de deuda",
      paymentId: "p1",
      creditPaymentDebtId: "card",
    },
  ];
  const debts = [
    {
      id: "card",
      creditor: "Tarjeta",
      kind: "credit",
      original: 0,
      initialBalance: 0,
      due: "2026-12-01",
      charges: [{ movementId: "purchase", amount: 100 }],
      payments: [
        { id: "p1", amount: 40, date: "2026-11-12", movementId: "payment" },
      ],
    },
  ];
  page.once("dialog", (d) => d.accept());
  await setBackupFile(page, {
    name: "separados.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ version: 2, movements, debts })),
  });
  await expect(page.getByRole("status")).toContainText("Datos guardados");
  await nav.getByRole("button", { name: "Inicio", exact: true }).click();
  await page.getByRole("button", { name: "Ver ingresos", exact: true }).click();
  const names = page.locator(".movement-info > strong");
  await expect(
    page.getByRole("tab", { name: "Ingresos", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(names).toHaveText(["Ingreso reciente", "Ingreso antiguo"]);
  await expect(page.locator(".filtered-total")).toContainText("$1,100.00");
  await chooseDate(page, "Desde", "2026-11-12");
  await chooseDate(page, "Hasta", "2026-11-12");
  await expect(names).toHaveText(["Ingreso reciente"]);
  await expect(page.locator(".filtered-total")).toContainText("$600.00");
  let pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar CSV", exact: true }).click();
  let file = await pending;
  expect(file.suggestedFilename()).toMatch(/^ingresos-/);
  let csv = await readFile((await file.path())!, "utf8");
  expect(csv).toContain("Ingreso reciente");
  expect(csv).not.toContain("Ingreso antiguo");
  expect(csv).not.toContain("Gasto reciente");
  await nav.getByRole("button", { name: "Reportes", exact: true }).click();
  await expect(page.locator("thead th")).toHaveText([
    "Periodo",
    "Ingresos",
    "Balance",
  ]);
  await expect(page.locator(".credit-report-totals > div")).toHaveCount(1);
  await nav.getByRole("button", { name: "Inicio", exact: true }).click();
  await page.getByRole("button", { name: "Ver egresos", exact: true }).click();
  await expect(
    page.getByRole("tab", { name: "Gastos", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(page.getByLabel("Desde", { exact: true })).toContainText(
    "Elegir fecha",
  );
  await expect(names).toHaveText([
    "Pago de tarjeta",
    "Gasto reciente",
    "Gasto antiguo",
  ]);
  await expect(page.locator(".filtered-total")).toContainText("$90.00");
  await chooseDate(page, "Desde", "2026-11-12");
  await chooseDate(page, "Hasta", "2026-11-12");
  await expect(names).toHaveText(["Pago de tarjeta", "Gasto reciente"]);
  await expect(page.locator(".filtered-total")).toContainText("$70.00");
  pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar CSV", exact: true }).click();
  file = await pending;
  expect(file.suggestedFilename()).toMatch(/^gastos-/);
  csv = await readFile((await file.path())!, "utf8");
  expect(csv).toContain("Pago de tarjeta");
  expect(csv).not.toContain("Compra pendiente");
  expect(csv).not.toContain("Ingreso reciente");
  await nav.getByRole("button", { name: "Reportes", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.locator("thead th")).toHaveText([
    "Periodo",
    "Egresos",
    "Balance",
  ]);
  await expect(page.locator("tbody td").nth(1)).toHaveText("$70.00");
  await expect(page.locator(".credit-report-totals > div")).toHaveCount(1);
  await nav.getByRole("button", { name: "Inicio", exact: true }).click();
  await page.getByRole("button", { name: "Ver todos", exact: true }).click();
  await expect(
    page.getByRole("tab", { name: "Todos", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(names).toHaveCount(6);
  await nav.getByRole("button", { name: "Reportes", exact: true }).click();
  await openAdvancedFilters(page);
  await page
    .getByLabel("Buscar movimientos", { exact: true })
    .fill("No existe este concepto");
  await expect(page.locator(".credit-report-totals")).toHaveCount(0);
  await expect(page.locator("table")).toHaveCount(0);
  await expect(
    page.getByRole("heading", {
      name: "Aún no hay datos para este periodo",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Limpiar filtros", exact: true })
    .click();
  await expect(page.locator("thead th")).toHaveText([
    "Periodo",
    "Ingresos",
    "Egresos",
    "Deuda adquirida",
    "Balance",
  ]);
  await expect(page.locator(".credit-report-totals > div")).toHaveCount(3);
});
