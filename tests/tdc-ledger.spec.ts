import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { setBackupFile } from "./backup-utils";
import { chooseDate } from "./date-utils";

test("TDC reúne compras y abonos sin duplicar gastos ni incluir pagos de otros préstamos", async ({
  page,
}) => {
  await page.goto("./");
  const nav = page.getByRole("navigation", { name: "Navegación principal" });
  await nav.getByRole("button", { name: "Respaldos", exact: true }).click();
  const base = {
    type: "expense",
    category: "Compras",
    notes: "",
    method: "Tarjeta de crédito",
  };
  const movements = [
    {
      ...base,
      id: "c1",
      date: "2026-11-01",
      merchant: "Compra anterior",
      amount: 100,
      creditDebtId: "card",
    },
    {
      ...base,
      id: "p1m",
      date: "2026-11-01",
      merchant: "Abono anterior",
      amount: 50,
      method: "Transferencia",
      category: "Pago de deuda",
      paymentId: "p1",
    },
    {
      ...base,
      id: "c2",
      date: "2026-11-12",
      merchant: "Compra reciente",
      amount: 200,
      creditDebtId: "card",
    },
    {
      ...base,
      id: "p2m",
      date: "2026-11-12",
      merchant: "Abono reciente",
      amount: 70,
      method: "Transferencia",
      category: "Pago de deuda",
      paymentId: "p2",
      creditPaymentDebtId: "card",
    },
    {
      ...base,
      id: "loanPay",
      date: "2026-11-12",
      merchant: "Abono préstamo",
      amount: 30,
      method: "Transferencia",
      category: "Pago de deuda",
      paymentId: "p3",
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
      merchant: "Ingreso",
      amount: 1000,
      type: "income",
      method: "Transferencia",
      category: "Sueldo",
    },
  ];
  const debts = [
    {
      id: "card",
      creditor: "Mi tarjeta",
      kind: "credit",
      original: 0,
      initialBalance: 0,
      due: "2027-01-01",
      charges: [
        { movementId: "c1", amount: 100 },
        { movementId: "c2", amount: 200 },
      ],
      payments: [
        { id: "p1", amount: 50, date: "2026-11-01", movementId: "p1m" },
        { id: "p2", amount: 70, date: "2026-11-12", movementId: "p2m" },
      ],
    },
    {
      id: "loan",
      creditor: "Préstamo",
      original: 500,
      initialBalance: 500,
      due: "2027-01-01",
      payments: [
        { id: "p3", amount: 30, date: "2026-11-12", movementId: "loanPay" },
      ],
    },
  ];
  page.once("dialog", (d) => d.accept());
  await setBackupFile(page, {
    name: "tdc.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ version: 2, movements, debts })),
  });
  await expect(page.getByRole("status")).toContainText("Datos guardados");
  await nav.getByRole("button", { name: "Movimientos", exact: true }).click();
  await page.getByRole("tab", { name: "TDC", exact: true }).click();
  const names = page.locator(".movement-info > strong");
  await expect(names).toHaveText([
    "Abono reciente",
    "Compra reciente",
    "Abono anterior",
    "Compra anterior",
  ]);
  await expect(page.locator(".tdc-entry-kind")).toHaveText([
    "Abono",
    "Compra",
    "Abono",
    "Compra",
  ]);
  await expect(page.locator(".tdc-totals")).toContainText("Compras: $300.00");
  await expect(page.locator(".tdc-totals")).toContainText("Abonos: $120.00");
  await expect(
    page.locator(".movement").first().locator(".movement-right > strong"),
  ).toHaveText("−$70.00");
  await expect(
    page.locator(".movement").nth(1).locator(".movement-right > strong"),
  ).toHaveText("+$200.00");
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar CSV", exact: true }).click();
  const file = await pending;
  expect(file.suggestedFilename()).toMatch(/^tdc-/);
  const csv = await readFile((await file.path())!, "utf8");
  expect(
    csv.split("\n").find((line) => line.includes("Abono anterior")),
  ).toContain("Abono de tarjeta");
  expect(csv).not.toContain("Abono préstamo");
  await chooseDate(page, "Desde", "2026-11-12");
  await chooseDate(page, "Hasta", "2026-11-12");
  await expect(names).toHaveText(["Abono reciente", "Compra reciente"]);
  await expect(page.locator(".tdc-totals")).toContainText("$200.00");
  await expect(page.locator(".tdc-totals")).toContainText("$70.00");
  await page
    .getByRole("button", { name: "Limpiar filtros", exact: true })
    .click();
  await page.getByRole("tab", { name: "Gastos", exact: true }).click();
  await expect(names).toHaveText([
    "Gasto efectivo",
    "Abono préstamo",
    "Abono reciente",
    "Abono anterior",
  ]);
  await expect(page.locator(".filtered-total")).toContainText("$170.00");
  await page.getByRole("tab", { name: "Todos", exact: true }).click();
  await expect(names).toHaveCount(7);
  await nav.getByRole("button", { name: "Deudas", exact: true }).click();
  await expect(page.locator(".debt-number")).toHaveText(["$180.00", "$470.00"]);
});
