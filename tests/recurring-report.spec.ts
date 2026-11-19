import { test, expect } from "@playwright/test";
import { setBackupFile } from "./backup-utils";

test("Reportes muestra el promedio mensual activo y su desglose sin registrar movimientos", async ({
  page,
}) => {
  await page.goto("./");
  const nav = page.getByRole("navigation", { name: "Navegación principal" });
  await nav.getByRole("button", { name: "Reportes", exact: true }).click();
  const report = page.locator(".page .report-recurring");
  await expect(report.locator("summary")).toHaveText("Recurrentes");
  await report.locator("summary").click();
  await expect(report).toContainText("No tienes recurrentes activos.");
  await expect(report.locator(".recurring-report-total dd")).toHaveText(
    "$0.00",
  );
  await nav.getByRole("button", { name: "Respaldos", exact: true }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await setBackupFile(page, {
    name: "recurrentes-sinteticos.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        version: 2,
        movements: [],
        debts: [],
        recurrents: [
          {
            id: "internet",
            merchant: "Internet",
            amount: 500,
            frequency: "monthly",
            active: true,
          },
          {
            id: "transporte",
            merchant: "Transporte",
            amount: 120,
            frequency: "weekly",
            active: true,
          },
          {
            id: "anual",
            merchant: "Suscripción",
            amount: 1200,
            frequency: "yearly",
            active: true,
          },
          {
            id: "pausado",
            merchant: "Servicio pausado",
            amount: 9000,
            frequency: "monthly",
            active: false,
          },
        ].map((r) => ({
          ...r,
          category: "Hogar",
          method: "Efectivo",
          nextDate: "2099-11-19",
          anchorDay: 19,
        })),
      }),
    ),
  });
  await expect(page.getByRole("status")).toContainText("Datos guardados");
  await nav.getByRole("button", { name: "Reportes", exact: true }).click();
  await expect(report).not.toHaveAttribute("open");
  await expect(report.locator("summary")).toHaveText("Recurrentes");
  await report.locator("summary").click();
  await expect(report.locator(".recurring-report-items > div")).toHaveCount(3);
  await expect(report.locator(".recurring-report-items dd")).toHaveText([
    "$500.00 /mes",
    "$520.00 /mes",
    "$100.00 /mes",
  ]);
  await expect(report.locator(".recurring-report-items dt").first()).toHaveText(
    "Internet",
  );
  await expect(
    report.locator(".recurring-report-items dt").nth(1),
  ).toContainText("Semanal · $120.00");
  await expect(
    report.locator(".recurring-report-items dt").nth(2),
  ).toContainText("Anual · $1,200.00");
  await expect(report.locator(".recurring-report-total")).toHaveText(
    "Total mensual$1,120.00",
  );
  await expect(report).toContainText("1 pausado no incluido");
  await expect(page.locator(".page .report-results")).toContainText(
    "Aún no hay datos para este periodo",
  );
  for (const width of [320, 844]) {
    await page.setViewportSize({ width, height: 844 });
    const bounds = await report.boundingBox();
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    expect(
      await report.evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
  }
});
