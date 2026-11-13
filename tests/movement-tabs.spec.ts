import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { setBackupFile } from "./backup-utils";
import { chooseDate } from "./date-utils";
import { openAdvancedFilters } from "./filter-utils";

test("pestañas filtran listado, total y CSV, conservan fechas y adaptan filtros", async ({
  page,
}) => {
  await page.goto("./");
  const nav = page.getByRole("navigation", { name: "Navegación principal" });
  await nav.getByRole("button", { name: "Respaldos", exact: true }).click();
  const base = { method: "Efectivo", notes: "" };
  const movements = [
    {
      ...base,
      id: "i1",
      type: "income",
      date: "2026-11-01",
      merchant: "Ingreso anterior",
      category: "Sueldo",
      amount: 50,
    },
    {
      ...base,
      id: "e1",
      type: "expense",
      date: "2026-11-01",
      merchant: "Gasto anterior",
      category: "Hogar",
      amount: 10,
    },
    {
      ...base,
      id: "c1",
      type: "expense",
      date: "2026-11-01",
      merchant: "Compra anterior",
      category: "Compras",
      amount: 10,
      method: "Tarjeta de crédito",
      creditDebtId: "card",
    },
    {
      ...base,
      id: "i2",
      type: "income",
      date: "2026-11-12",
      merchant: "Ingreso reciente",
      category: "Sueldo",
      amount: 20,
    },
    {
      ...base,
      id: "e2",
      type: "expense",
      date: "2026-11-12",
      merchant: "Gasto reciente",
      category: "Hogar",
      amount: 5,
    },
    {
      ...base,
      id: "c2",
      type: "expense",
      date: "2026-11-12",
      merchant: "Compra reciente",
      category: "Compras",
      amount: 40,
      method: "Tarjeta de crédito",
      creditDebtId: "card",
    },
  ];
  const debts = [
    {
      id: "card",
      creditor: "Mi tarjeta",
      kind: "credit",
      original: 0,
      initialBalance: 0,
      due: "2026-12-01",
      charges: [
        { movementId: "c1", amount: 10 },
        { movementId: "c2", amount: 40 },
      ],
      payments: [],
    },
  ];
  page.once("dialog", (d) => d.accept());
  await setBackupFile(page, {
    name: "tabs.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ version: 2, movements, debts })),
  });
  await expect(page.getByRole("status")).toContainText("Datos guardados");
  await nav.getByRole("button", { name: "Movimientos", exact: true }).click();
  const types = page.getByRole("tablist", { name: "Mostrar movimientos" });
  await expect(types.getByRole("tab")).toHaveText([
    "Todos",
    "Ingresos",
    "Gastos",
    "Compras con TDC",
  ]);
  await expect(
    page.getByLabel("Tipo de movimiento", { exact: true }),
  ).toHaveCount(0);
  await expect(page.getByLabel("Desde", { exact: true })).toBeVisible();
  await expect(
    page.getByLabel("Buscar movimientos", { exact: true }),
  ).toBeHidden();
  await types.getByRole("tab", { name: "Gastos", exact: true }).click();
  const names = page.locator(".movement-info > strong");
  await expect(names).toHaveText(["Gasto reciente", "Gasto anterior"]);
  await expect(page.locator(".filtered-total")).toContainText("$15.00");
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar CSV", exact: true }).click();
  const file = await pending;
  expect(file.suggestedFilename()).toMatch(/^gastos-/);
  const csv = await readFile((await file.path())!, "utf8");
  expect(csv).toContain("Gasto reciente");
  expect(csv).not.toContain("Ingreso reciente");
  expect(csv).not.toContain("Compra reciente");
  await chooseDate(page, "Desde", "2026-11-12");
  await chooseDate(page, "Hasta", "2026-11-12");
  await types.getByRole("tab", { name: "Ingresos", exact: true }).click();
  await expect(names).toHaveText(["Ingreso reciente"]);
  await openAdvancedFilters(page);
  await expect(
    page.getByLabel("Filtrar tarjeta o deuda", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByLabel("Categoría", { exact: true }).locator("option"),
  ).toHaveText(["Todas las categorías", "Sueldo"]);
  await page.getByLabel("Categoría", { exact: true }).selectOption("Sueldo");
  await types
    .getByRole("tab", { name: "Compras con TDC", exact: true })
    .click();
  await expect(names).toHaveText(["Compra reciente"]);
  await expect(page.getByLabel("Filtrar método", { exact: true })).toHaveCount(
    0,
  );
  await expect(
    page.getByLabel("Filtrar tarjeta", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Categoría", { exact: true })).toHaveValue("");
  await expect(page.locator(".filtered-total")).toContainText("$40.00");
  await page
    .getByRole("button", { name: "Limpiar filtros", exact: true })
    .click();
  await expect(
    types.getByRole("tab", { name: "Compras con TDC", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".filtered-total")).toContainText("$50.00");
  await types.getByRole("tab", { name: "Todos", exact: true }).click();
  await types
    .getByRole("tab", { name: "Todos", exact: true })
    .press("ArrowRight");
  await expect(
    types.getByRole("tab", { name: "Ingresos", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", { name: "Ingresos", exact: true }).press("End");
  await expect(
    types.getByRole("tab", { name: "Compras con TDC", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page
    .getByRole("tab", { name: "Compras con TDC", exact: true })
    .press("Home");
  await expect(names).toHaveCount(6);
  await expect(page.locator(".movement-totals")).toContainText("$70.00");
  await expect(page.locator(".movement-totals")).toContainText("$15.00");
  await expect(page.locator(".movement-totals")).toContainText("$50.00");
  await openAdvancedFilters(page);
  await page
    .getByLabel("Buscar movimientos", { exact: true })
    .fill("Sin coincidencias");
  await expect(names).toHaveCount(0);
  await expect(
    page.getByRole("heading", {
      name: "No hay movimientos con estos filtros",
      exact: true,
    }),
  ).toBeVisible();
});
