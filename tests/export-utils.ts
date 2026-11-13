import ExcelJS from "exceljs";
import type { Download } from "@playwright/test";
export async function exportText(file: Download) {
  const book = new ExcelJS.Workbook();
  await book.xlsx.readFile((await file.path())!);
  const rows: string[] = [];
  book
    .getWorksheet("Datos")!
    .eachRow((row) =>
      rows.push(
        Array.isArray(row.values)
          ? row.values.map((v) => String(v ?? "")).join(",")
          : "",
      ),
    );
  return rows.join("\n");
}
