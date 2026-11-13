import { test, expect } from "@playwright/test";
import ExcelJS from "exceljs";
import { readFile } from "node:fs/promises";
import { setBackupFile } from "./backup-utils";
import { chooseDate } from "./date-utils";

test("Excel y PDF respetan tipo y fechas; Reportes exporta agrupación y funcionan sin conexión", async ({
  page,
  context,
}, testInfo) => {
  await page.goto("./");
  const nav = page.getByRole("navigation", { name: "Navegación principal" });
  await nav.getByRole("button", { name: "Respaldos", exact: true }).click();
  const base = {
    date: "2026-11-12",
    category: "Otros",
    method: "Efectivo",
    notes: "",
  };
  const movements = [
    {
      ...base,
      id: "old",
      type: "income",
      date: "2026-11-11",
      merchant: "Ingreso anterior",
      amount: 200,
    },
    {
      ...base,
      id: "income",
      type: "income",
      merchant: "Ingreso seleccionado",
      amount: 100,
    },
    {
      ...base,
      id: "cash",
      type: "expense",
      merchant: "Gasto seleccionado",
      amount: 15.5,
    },
    {
      ...base,
      id: "purchase",
      type: "expense",
      merchant: "Compra seleccionada",
      amount: 80,
      creditDebtId: "card",
      method: "Tarjeta de crédito",
    },
    {
      ...base,
      id: "payment",
      type: "expense",
      merchant: "Tarjeta",
      amount: 20,
      paymentId: "p",
      notes: "Abono vinculado a deuda",
    },
  ];
  page.once("dialog", (d) => d.accept());
  await setBackupFile(page, {
    name: "exports.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        version: 2,
        movements,
        debts: [
          {
            id: "card",
            creditor: "Tarjeta",
            kind: "credit",
            original: 100,
            initialBalance: 100,
            due: "2026-12-01",
            charges: [{ movementId: "purchase", amount: 80 }],
            payments: [
              { id: "p", movementId: "payment", date: base.date, amount: 20 },
            ],
          },
        ],
      }),
    ),
  });
  await expect(page.getByRole("status")).toContainText("Datos guardados");
  await nav.getByRole("button", { name: "Movimientos", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Exportar CSV", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("tab", { name: "Ingresos", exact: true }).click();
  await chooseDate(page, "Desde", "2026-11-12");
  async function xlsx() {
    const promise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Excel", exact: true }).click();
    const file = await promise;
    expect(file.suggestedFilename()).toMatch(/\.xlsx$/);
    const book = new ExcelJS.Workbook();
    await book.xlsx.readFile((await file.path())!);
    return book;
  }
  const income = await xlsx();
  expect(income.getWorksheet("Datos")!.rowCount).toBe(2);
  expect(income.getWorksheet("Datos")!.getCell("C2").value).toBe(
    "Ingreso seleccionado",
  );
  expect(income.getWorksheet("Datos")!.getCell("F2").value).toBe(100);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener(
          "controllerchange",
          () => resolve(),
          { once: true },
        ),
      );
  });
  await context.setOffline(true);
  const pdfPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "PDF", exact: true }).click();
  const pdf = await pdfPromise;
  await pdf.saveAs(testInfo.outputPath("ingresos.pdf"));
  expect(pdf.suggestedFilename()).toMatch(/^ingresos-.*\.pdf$/);
  const text = (await readFile((await pdf.path())!)).toString("latin1");
  expect(text.startsWith("%PDF-")).toBe(true);
  expect(text).toContain("Ingreso seleccionado");
  expect(text).not.toContain("Gasto seleccionado");
  expect(text).not.toContain("Ingreso anterior");
  await page.getByRole("tab", { name: "TDC", exact: true }).click();
  const tdc = await xlsx();
  expect(tdc.getWorksheet("Datos")!.rowCount).toBe(3);
  expect(tdc.getWorksheet("Datos")!.getCell("B2").value).toBe("Abono TDC");
  const totals = tdc.getWorksheet("Resumen")!.getSheetValues().toString();
  expect(totals).toContain("Compras TDC");
  expect(totals).toContain("Abonos TDC");
  await nav.getByRole("button", { name: "Reportes", exact: true }).click();
  await page
    .getByLabel("Tipo de movimiento", { exact: true })
    .selectOption("expense");
  const report = await xlsx();
  expect(report.getWorksheet("Datos")!.getRow(1).values).toEqual([
    ,
    "Periodo",
    "Egresos",
    "Balance",
  ]);
  expect(report.getWorksheet("Datos")!.getCell("B2").value).toBe(35.5);
  expect(report.getWorksheet("Datos")!.getCell("C2").value).toBe(-35.5);
  await nav.getByRole("button", { name: "Respaldos", exact: true }).click();
  const all = await xlsx();
  expect(all.getWorksheet("Datos")!.rowCount).toBe(6);
  await expect(
    page.getByRole("button", { name: "Exportar respaldo JSON", exact: true }),
  ).toBeVisible();
});
