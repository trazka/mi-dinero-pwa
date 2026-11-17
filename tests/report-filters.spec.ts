import { openMovementFilters } from "./filter-utils";
import { openReportFilters } from "./report-utils";
import { test, expect } from "@playwright/test";
import { setBackupFile } from "./backup-utils";
import { exportText } from "./export-utils";
import { openAdvancedFilters } from "./filter-utils";
import { chooseDate } from "./date-utils";

test("filtros visibles no mezclan reservas ni disponible y exportan los mismos resultados", async ({
  page,
}) => {
  await page.goto("./");
  const nav = page.getByRole("navigation", { name: "Navegación principal" });
  await nav.getByRole("button", { name: "Respaldos", exact: true }).click();
  page.once("dialog", (d) => d.accept());
  const base = {
    date: "2026-11-12",
    method: "Transferencia",
    notes: "",
    category: "Otros",
  };
  await setBackupFile(page, {
    name: "filters.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        version: 2,
        movements: [
          {
            ...base,
            id: "income",
            type: "income",
            merchant: "Nómina",
            amount: 1000,
          },
          {
            ...base,
            id: "expense",
            type: "expense",
            merchant: "Gasolina",
            category: "Transporte",
            method: "Efectivo",
            amount: 100,
          },
          {
            ...base,
            id: "purchase",
            type: "expense",
            merchant: "Gasolina TDC",
            category: "Transporte",
            method: "Tarjeta de crédito",
            creditDebtId: "card",
            amount: 200,
          },
          {
            ...base,
            id: "payment",
            type: "expense",
            merchant: "BBVA",
            category: "Pago de deuda",
            paymentId: "p",
            creditPaymentDebtId: "card",
            amount: 50,
          },
        ],
        debts: [
          {
            id: "card",
            creditor: "BBVA",
            kind: "credit",
            original: 200,
            initialBalance: 0,
            due: "2026-12-01",
            charges: [{ movementId: "purchase", amount: 200 }],
            payments: [
              { id: "p", movementId: "payment", date: base.date, amount: 50 },
            ],
          },
        ],
        savings: [
          {
            id: "goal",
            name: "Privado",
            target: 500,
            entries: [
              { id: "d", type: "deposit", amount: 300, date: base.date },
              { id: "w", type: "withdrawal", amount: 50, date: base.date },
              { id: "next", type: "deposit", amount: 50, date: "2026-12-01" },
            ],
          },
        ],
      }),
    ),
  });
  await expect(page.getByRole("status")).toContainText("Datos guardados");
  await nav.getByRole("button", { name: "Reportes", exact: true }).click();
  await openReportFilters(page);
  await chooseDate(page, "Desde", "2026-11-01");
  await chooseDate(page, "Hasta", "2026-11-30");
  const report = page.locator(".page .report-periods");
  await expect(report).toContainText("$400.00");
  await expect(report).toContainText("$600.00");
  await openAdvancedFilters(page);
  await expect(page.getByLabel("Establecimiento", { exact: true })).toHaveCount(
    0,
  );
  await page.getByLabel("Filtrar tarjeta o deuda").selectOption("card");
  await expect(report.locator("dt")).toHaveText(["Gastos", "Deuda adquirida"]);
  await expect(report.locator("dd")).toHaveText(["$50.00", "$200.00"]);
  await page.locator(".page .advanced-filters > summary").click();
  const active = page.getByRole("list", { name: "Filtros activos" });
  await expect(active).toContainText("Tarjeta o deuda: BBVA");
  await expect(active).toBeVisible();
  await active
    .getByRole("button", { name: "Quitar filtro Tarjeta o deuda: BBVA" })
    .click();
  await expect(report).toContainText("Disponible");
  await openAdvancedFilters(page);
  await page
    .getByLabel("Categoría", { exact: true })
    .selectOption("Transporte");
  await expect(report.locator("dt")).toHaveText(["Gastos", "Deuda adquirida"]);
  await expect(report.locator("dd")).toHaveText(["$100.00", "$200.00"]);
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Excel", exact: true }).click();
  const exported = await exportText(await pending);
  expect(exported).toContain("Gastos");
  expect(exported).not.toContain("Disponible");
  expect(exported).not.toContain("Utilizado");
  expect(exported).not.toContain("Privado");
  await page.getByLabel("Filtrar método").selectOption("Efectivo");
  await expect(active.locator("li")).toHaveCount(2);
  await expect(report.locator("dd")).toHaveText(["$100.00"]);
  await page
    .getByLabel("Buscar movimientos", { exact: true })
    .fill("inexistente");
  await expect(page.locator(".report-period")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Excel", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Quitar filtro Búsqueda: inexistente" })
    .click();
  await expect(report).toContainText("$100.00");
  await page.setViewportSize({ width: 320, height: 844 });
  expect(
    await active.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
  ).toBe(true);
  await openMovementFilters(page);
  await page
    .getByRole("button", { name: "Limpiar filtros", exact: true })
    .click();
  await expect(active).toHaveCount(0);
  await expect(report).toContainText("Disponible");
  await page
    .getByLabel("Tipo de movimiento", { exact: true })
    .selectOption("income");
  await expect(report.locator("dt")).toHaveText(["Ingresos"]);
  await expect(page.locator(".report-period")).toHaveCount(1);
});
