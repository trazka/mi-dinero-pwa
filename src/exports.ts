import { expenseAmount, type Movement } from "./data";

export function exportDate(iso: string) {
  const [year, month, day] = iso.split("-");
  const months = [
    "ene",
    "feb",
    "mar",
    "abr",
    "may",
    "jun",
    "jul",
    "ago",
    "sep",
    "oct",
    "nov",
    "dic",
  ];
  return `${day}-${months[Number(month) - 1]}-${year}`;
}

export type ExportTable = {
  title: string;
  filters: string[];
  totals: [string, number][];
  columns: string[];
  rows: (string | number)[][];
  moneyColumns: number[];
  note?: string;
  // A narrow version for reading on a phone.
  pdfColumns?: string[];
  pdfRows?: (string | number)[][];
  pdfMoneyColumns?: number[];
};
const currency = (n: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(n);
export function movementExport(
  movements: Movement[],
  title: string,
  filters: string[],
  onlyTdc = false,
): ExportTable {
  const income = movements.reduce(
    (s, m) => s + (m.type === "income" ? m.amount : 0),
    0,
  );
  const expense = movements.reduce((s, m) => s + expenseAmount(m), 0);
  const purchases = movements.reduce(
    (s, m) => s + (m.creditDebtId ? m.amount : 0),
    0,
  );
  const payments = movements.reduce(
    (s, m) => s + (m.creditPaymentDebtId ? m.amount : 0),
    0,
  );
  const kind = (m: Movement) =>
    m.creditPaymentDebtId
      ? "Abono TDC"
      : m.creditDebtId
        ? "Compra TDC"
        : m.type === "income"
          ? "Ingreso"
          : "Gasto";
  return {
    title,
    filters,
    note:
      payments > 0 ? "Los abonos TDC ya están incluidos en Gastos." : undefined,
    totals: (
      [
        ...(!onlyTdc
          ? [
              ["Ingresos", income],
              ["Gastos", expense],
            ]
          : []),
        ["Compras TDC", purchases],
        [onlyTdc ? "Abonos TDC" : "Abonos TDC (incluidos en gastos)", payments],
      ] as [string, number][]
    ).filter(([, n]) => n > 0),
    columns: [
      "Fecha",
      "Tipo",
      "Establecimiento o concepto",
      "Categoría",
      "Método de pago",
      "Importe MXN",
      "Gasto contabilizado MXN",
      "Notas",
    ],
    rows: movements.map((m) => [
      exportDate(m.date),
      kind(m),
      m.merchant,
      m.category,
      m.method,
      m.amount,
      expenseAmount(m),
      m.notes,
    ]),
    moneyColumns: [5, 6],
    pdfColumns: ["Fecha", "Concepto", "Tipo", "Importe MXN"],
    pdfRows: movements.map((m) => [
      exportDate(m.date),
      [
        m.merchant,
        `${m.category} · ${m.method}`,
        m.notes === "Abono vinculado a deuda" ? "" : m.notes,
      ]
        .filter(Boolean)
        .join("\n"),
      kind(m),
      m.amount,
    ]),
    pdfMoneyColumns: [3],
  };
}
export async function excelBlob(table: ExportTable): Promise<Blob> {
  const { default: ExcelJS } = await import("exceljs");
  const book = new ExcelJS.Workbook();
  book.creator = "Mi dinero";
  const summary = book.addWorksheet("Resumen");
  summary.columns = [{ width: 38 }, { width: 30 }];
  summary.addRow(["Mi dinero", table.title]);
  summary.addRow(["Moneda", "MXN"]);
  for (const filter of table.filters) summary.addRow(["Filtro", filter]);
  summary.addRow([]);
  summary.addRow(["Totales", "Importe MXN"]);
  for (const [label, total] of table.totals) {
    const row = summary.addRow([label, total]);
    row.getCell(2).numFmt = '"$"#,##0.00';
  }
  summary.addRow([]);
  summary.addRow(["Registros", table.rows.length]);
  if (table.note) summary.addRow(["Nota", table.note]);
  summary.getColumn(2).alignment = { wrapText: true, vertical: "top" };
  const sheet = book.addWorksheet("Datos", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  sheet.addRow(table.columns);
  for (const row of table.rows) sheet.addRow(row);
  sheet.columns.forEach((col, index) => {
    col.width = index === 0 ? 16 : table.moneyColumns.includes(index) ? 23 : 30;
    col.alignment = { vertical: "top", wrapText: true };
  });
  for (const index of table.moneyColumns)
    sheet.getColumn(index + 1).numFmt = '"$"#,##0.00';
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(1, sheet.rowCount), column: table.columns.length },
  };
  for (const s of [summary, sheet]) {
    s.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    s.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF174832" },
    };
    s.getRow(1).height = 28;
  }
  const buffer = await book.xlsx.writeBuffer();
  return new Blob([new Uint8Array(buffer)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
export async function pdfBlob(table: ExportTable): Promise<Blob> {
  const [{ jsPDF }, { autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const doc = new jsPDF({ format: "a5", unit: "mm" });
  const width = doc.internal.pageSize.getWidth();
  let y = 12;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(23, 72, 50);
  doc.text("Mi dinero", 10, y);
  y += 8;
  const writeLines = (text: string, lineHeight: number) => {
    const lines: string[] = doc.splitTextToSize(text, width - 20);
    for (const line of lines) {
      if (y > doc.internal.pageSize.getHeight() - 22) {
        doc.addPage();
        y = 12;
      }
      doc.text(line, 10, y);
      y += lineHeight;
    }
  };
  doc.setFontSize(12);
  writeLines(table.title, 6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(50);
  doc.setFontSize(9);
  for (const filter of ["Moneda: MXN", ...table.filters])
    writeLines(filter, 4.5);
  y += 2;
  for (const [label, total] of table.totals)
    writeLines(`${label}: ${currency(total)}`, 5);
  writeLines(
    `${table.rows.length} ${table.rows.length === 1 ? "registro" : "registros"}`,
    5,
  );
  if (table.note) writeLines(table.note, 4.5);
  if (y > doc.internal.pageSize.getHeight() - 35) {
    doc.addPage();
    y = 12;
  }
  const columns = table.pdfColumns ?? table.columns,
    rows = table.pdfRows ?? table.rows,
    moneyColumns = table.pdfMoneyColumns ?? table.moneyColumns;
  autoTable(doc, {
    startY: y + 2,
    margin: { left: 10, right: 10, top: 12, bottom: 16 },
    head: [columns],
    body: rows.map((row) =>
      row.map((cell, i) =>
        typeof cell === "number" && moneyColumns.includes(i)
          ? currency(cell)
          : String(cell),
      ),
    ),
    styles: {
      fontSize: 9,
      cellPadding: 2.5,
      overflow: "linebreak",
      textColor: 40,
    },
    headStyles: { fillColor: [23, 72, 50], textColor: 255 },
    alternateRowStyles: { fillColor: [242, 246, 243] },
    columnStyles: Object.fromEntries(
      moneyColumns.map((i) => [i, { halign: "right" }]),
    ),
    rowPageBreak: "avoid",
  });
  for (let i = 1; i <= doc.getNumberOfPages(); i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(90);
    doc.text(
      `Mi dinero · ${i} / ${doc.getNumberOfPages()}`,
      10,
      doc.internal.pageSize.getHeight() - 7,
    );
  }
  return doc.output("blob");
}
export function saveExport(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob),
    link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
