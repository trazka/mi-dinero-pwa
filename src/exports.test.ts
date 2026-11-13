import { describe, it, expect } from "vitest";
import ExcelJS from "exceljs";
import { excelBlob, movementExport, pdfBlob } from "./exports";
import type { Movement } from "./data";
const base: Movement = {
  id: "expense",
  type: "expense",
  date: "2026-11-12",
  merchant: "=1+1",
  category: "Alimentación",
  method: "Transferencia",
  amount: 12.5,
  notes: "Nota personal",
};
describe("exportaciones legibles", () => {
  it("separa compras y abonos sin sumar dos veces el gasto", () => {
    const table = movementExport(
      [
        base,
        { ...base, id: "purchase", amount: 100, creditDebtId: "card" },
        { ...base, id: "payment", amount: 20, creditPaymentDebtId: "card" },
      ],
      "TDC",
      [],
    );
    expect(table.totals).toEqual([
      ["Gastos", 32.5],
      ["Compras TDC", 100],
      ["Abonos TDC (incluidos en gastos)", 20],
    ]);
  });
  it("genera XLSX real con importes numéricos, filtros y texto sin fórmulas", async () => {
    const blob = await excelBlob(
      movementExport([base], "Gastos", ["Desde: 12-nov-2026"]),
    );
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await blob.arrayBuffer());
    const sheet = workbook.getWorksheet("Datos")!;
    expect(sheet.getCell("A2").value).toBe("12-nov-2026");
    expect(sheet.getCell("C2").value).toBe("=1+1");
    expect(sheet.getCell("F2").value).toBe(12.5);
    expect(sheet.getCell("F2").numFmt).toContain("0.00");
    expect(sheet.autoFilter).toBeTruthy();
    expect(workbook.getWorksheet("Resumen")!.getCell("B3").value).toBe(
      "Desde: 12-nov-2026",
    );
  });
  it("genera PDF paginado con todos los movimientos y encabezados repetidos", async () => {
    const rows = Array.from({ length: 90 }, (_, i) => ({
      ...base,
      merchant: `Concepto ${i}`,
      id: String(i),
    }));
    const blob = await pdfBlob(
      movementExport(rows, "Gastos", ["Desde: 12-nov-2026"]),
    );
    const text = await blob.text();
    expect(text.startsWith("%PDF-")).toBe(true);
    expect(text).toContain("Concepto 89");
    expect(text.match(/\/Type \/Page\b/g)!.length).toBeGreaterThan(1);
    expect(text).toContain("Desde: 12-nov-2026");
  });
});
