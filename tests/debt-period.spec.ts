import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { setBackupFile } from "./backup-utils";
import { chooseDate } from "./date-utils";

test("deuda adquirida por periodo separa compras TDC de pagos y deja limpiar al final", async ({
  page,
}) => {
  await page.goto("./");
  const nav = page.getByRole("navigation", { name: "Navegación principal" });
  await nav.getByRole("button", { name: "Respaldos", exact: true }).click();
  const base = {
    type: "expense",
    method: "Tarjeta de crédito",
    category: "Compras",
    notes: "",
  };
  const movements = [
    {
      ...base,
      id: "old",
      date: "2026-11-01",
      merchant: "Compra anterior",
      amount: 100,
      creditDebtId: "card",
    },
    {
      ...base,
      id: "new",
      date: "2026-11-12",
      merchant: "Compra del periodo",
      amount: 200,
      creditDebtId: "card",
    },
    {
      ...base,
      id: "payment",
      date: "2026-11-12",
      merchant: "Pago tarjeta",
      amount: 50,
      method: "Transferencia",
      category: "Pago de deuda",
      paymentId: "p1",
      creditPaymentDebtId: "card",
    },
    {
      ...base,
      id: "cash",
      date: "2026-11-12",
      merchant: "Gasto efectivo",
      amount: 20,
      method: "Efectivo",
    },
    {
      ...base,
      id: "income",
      date: "2026-11-12",
      merchant: "Sueldo",
      amount: 1000,
      type: "income",
      category: "Sueldo",
      method: "Transferencia",
    },
  ];
  const debts = [
    {
      id: "card",
      creditor: "Tarjeta de prueba",
      kind: "credit",
      original: 500,
      initialBalance: 500,
      due: "2027-01-01",
      charges: [
        { movementId: "old", amount: 100 },
        { movementId: "new", amount: 200 },
      ],
      payments: [
        { id: "p1", amount: 50, date: "2026-11-12", movementId: "payment" },
      ],
    },
  ];
  page.once("dialog", (d) => d.accept());
  await setBackupFile(page, {
    name: "deuda.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ version: 2, movements, debts })),
  });
  await expect(page.getByRole("status")).toContainText("Datos guardados");
  await nav.getByRole("button", { name: "Inicio", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Ver deuda adquirida", exact: true }),
  ).toContainText("$300.00");
  await expect(
    page.getByRole("button", { name: "Ver egresos", exact: true }),
  ).toContainText("$70.00");
  await page
    .getByRole("button", { name: "Ver deuda adquirida", exact: true })
    .click();
  await expect(
    page.getByRole("tab", { name: "TDC", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".movement-info > strong")).toHaveText([
    "Abono · Pago tarjeta",
    "Compra del periodo",
    "Compra anterior",
  ]);
  await chooseDate(page, "Desde", "2026-11-12");
  await chooseDate(page, "Hasta", "2026-11-12");
  await expect(page.locator(".movement-info > strong")).toHaveText([
    "Abono · Pago tarjeta",
    "Compra del periodo",
  ]);
  await expect(page.locator(".filtered-total")).toContainText("$200.00");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar CSV", exact: true }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^tdc-/);
  const csv = await readFile((await file.path())!, "utf8");
  expect(csv).toContain("Compra del periodo");
  expect(csv).not.toContain("Compra anterior");
  expect(csv).toContain("Pago tarjeta");
  await nav.getByRole("button", { name: "Reportes", exact: true }).click();
  await expect(page.locator("thead th")).toHaveText([
    "Periodo",
    "Deuda adquirida",
  ]);
  await expect(page.locator("tbody td").nth(1)).toHaveText("$200.00");
  await expect(page.locator(".credit-report-totals > div")).toHaveCount(1);
  await page
    .getByLabel("Tipo de movimiento", { exact: true })
    .selectOption("all");
  await expect(page.locator("tbody td").nth(1)).toHaveText("$1,000.00");
  await expect(page.locator("tbody td").nth(2)).toHaveText("$70.00");
  await expect(page.locator("tbody td").nth(3)).toHaveText("$200.00");
  await expect(page.locator("tbody td").nth(4)).toHaveText("$930.00");
  await expect(page.locator(".filters > :last-child")).toHaveClass(
    "filter-actions",
  );
  const lastField = await page
    .locator(".filters > .field")
    .last()
    .boundingBox();
  const actions = await page.locator(".filter-actions").boundingBox();
  expect(actions!.y).toBeGreaterThanOrEqual(lastField!.y + lastField!.height);
  await page
    .getByRole("button", { name: "Limpiar filtros", exact: true })
    .click();
  await expect(page.getByLabel("Desde", { exact: true })).toContainText(
    "Elegir fecha",
  );
  await expect(page.locator(".credit-report-totals")).toContainText("$300.00");
});
