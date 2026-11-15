import { test, expect } from "@playwright/test";
import { setBackupFile } from "./backup-utils";
import { chooseDate } from "./date-utils";
import { exportText } from "./export-utils";

test("Reportes descuenta reservas, libera retiros y cabe en el teléfono", async ({
  page,
}, testInfo) => {
  await page.goto("./");
  const nav = page.getByRole("navigation", { name: "Navegación principal" });
  await nav.getByRole("button", { name: "Respaldos", exact: true }).click();
  page.once("dialog", (d) => d.accept());
  const base = {
    date: "2026-11-01",
    merchant: "Movimiento",
    category: "Otros",
    method: "Transferencia",
    notes: "",
  };
  await setBackupFile(page, {
    name: "report.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        version: 2,
        debts: [],
        movements: [
          { ...base, id: "i", type: "income", amount: 22382.65 },
          { ...base, id: "e", type: "expense", amount: 20364.7 },
        ],
        savings: [
          {
            id: "s",
            name: "Meta secreta",
            target: 4500,
            entries: [
              { id: "d", type: "deposit", amount: 2000, date: "2026-11-02" },
              { id: "w", type: "withdrawal", amount: 500, date: "2026-12-01" },
            ],
          },
        ],
      }),
    ),
  });
  await expect(page.getByRole("status")).toContainText("Datos guardados");
  await nav.getByRole("button", { name: "Reportes", exact: true }).click();
  const table = page.locator(".page .report-table");
  await expect(table.locator("th")).toHaveText([
    "Periodo",
    "Ingresos",
    "Egresos",
    "Libre",
  ]);
  const november = table
    .getByRole("row")
    .filter({ hasText: "noviembre de 2026" });
  await expect(november.locator("td").last()).toHaveText("$17.95");
  const december = table
    .getByRole("row")
    .filter({ hasText: "diciembre de 2026" });
  await expect(december.locator("td").last()).toHaveText("$500.00");
  await expect(page.locator(".page")).not.toContainText("Meta secreta");
  for (const width of [320, 390, 844]) {
    await page.setViewportSize({ width, height: width === 844 ? 390 : 844 });
    await expect
      .poll(() => table.evaluate((el) => el.scrollWidth <= el.clientWidth + 1))
      .toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await table.screenshot({
    path: testInfo.outputPath("reporte-sin-desplazamiento.png"),
  });
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Excel", exact: true }).click();
  const text = await exportText(await download);
  expect(text).toContain("Libre");
  expect(text).toContain("17.95");
  expect(text).toContain("500");
  expect(text).not.toContain("Meta secreta");
  await chooseDate(page, "Desde", "2026-12-01");
  await chooseDate(page, "Hasta", "2026-12-01");
  await expect(table.locator("tbody tr")).toHaveCount(1);
  await expect(table.locator("tbody td").last()).toHaveText("$500.00");
});
