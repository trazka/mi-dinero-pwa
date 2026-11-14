import { openSidebar } from "./layout-utils";
import { test, expect } from "@playwright/test";
import { setBackupFile } from "./backup-utils";

test("todas las vistas y formularios verticales conservan controles y textos dentro del panel", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.goto("./");
  const nav = page.getByRole("navigation", { name: "Navegación principal" });
  await nav.getByRole("button", { name: "Respaldos", exact: true }).click();
  page.once("dialog", (d) => d.accept());
  const fixture = {
    version: 2,
    movements: [
      {
        id: "income",
        type: "income",
        date: "2026-11-12",
        merchant: "Nómina",
        category: "Sueldo",
        method: "Transferencia",
        amount: 200000,
        notes: "",
      },
    ],
    debts: [
      {
        id: "card",
        creditor: "Tarjeta de gastos familiares con nombre largo",
        kind: "credit",
        original: 153900,
        initialBalance: 118097.7,
        due: "2026-11-10",
        charges: [],
        payments: [],
      },
    ],
    savings: [
      {
        id: "goal",
        name: "Fondo de emergencia y gastos de la familia",
        target: 50000,
        entries: [],
      },
    ],
    recurrents: [
      {
        id: "rule",
        merchant: "Servicio mensual de la casa con nombre largo",
        category: "Hogar",
        amount: 250,
        method: "Efectivo",
        nextDate: "2026-12-01",
        frequency: "monthly",
        active: true,
        anchorDay: 1,
      },
    ],
  };
  await setBackupFile(page, {
    name: "vertical.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(fixture)),
  });
  await expect(page.getByRole("status")).toContainText("Datos guardados");
  async function fits() {
    const overflow = await page.evaluate(() => {
      const root = document.querySelector(".page")!,
        bounds = root.getBoundingClientRect();
      return [
        ...root.querySelectorAll<HTMLElement>(
          ".panel,.stat,.movement,.field,.planning-actions,.planning-heading,.panel-heading,.form-buttons,.summary-strip,.report-totals,.debt-meta,.cycle-info,.planning-item",
        ),
      ]
        .filter((el) => {
          if (el.closest(".table-scroll")) return false;
          const box = el.getBoundingClientRect();
          return (
            box.width > 0 &&
            (box.left < bounds.left - 1 ||
              box.right > bounds.right + 1 ||
              el.scrollWidth > el.clientWidth + 2)
          );
        })
        .map((el) => el.className);
    });
    expect(overflow).toEqual([]);
  }
  for (const width of [320, 390, 430])
    for (const scheme of ["light", "dark"] as const) {
      await page.setViewportSize({ width, height: 844 });
      await page.emulateMedia({ colorScheme: scheme });
      for (const name of [
        "Inicio",
        "Movimientos",
        "Deudas",
        "Apartados",
        "Reportes",
        "Respaldos",
      ]) {
        await nav.getByRole("button", { name, exact: true }).click();
        if (
          name === "Apartados" &&
          (await page
            .getByRole("button", { name: "Mostrar ahorros", exact: true })
            .isVisible())
        )
          await page
            .getByRole("button", { name: "Mostrar ahorros", exact: true })
            .click();
        await fits();
        if (name === "Reportes") {
          const clear = page.getByRole("button", {
            name: "Limpiar filtros",
            exact: true,
          });
          await expect(clear).toHaveCSS("min-height", "48px");
          const button = await clear.boundingBox(),
            filters = await page.locator(".filters").boundingBox();
          expect(Math.abs(button!.width - filters!.width)).toBeLessThan(2);
          await page
            .getByLabel("Tipo de movimiento", { exact: true })
            .selectOption("credit");
          await clear.tap();
          await expect(
            page.getByLabel("Tipo de movimiento", { exact: true }),
          ).toHaveValue("all");
        }
      }
    }
  await page.setViewportSize({ width: 320, height: 844 });
  await nav.getByRole("button", { name: "Inicio", exact: true }).click();
  await page
    .getByRole("button", { name: "Nuevo movimiento", exact: true })
    .click();
  await page
    .getByLabel("Establecimiento o concepto", { exact: true })
    .fill("Un concepto largo que se puede seguir escribiendo");
  await page.getByLabel("Importe (MXN)", { exact: true }).fill("153900");
  await page.getByLabel("Fecha", { exact: true }).click();
  await page.getByRole("button", { name: "Hoy", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Nuevo movimiento", exact: true }),
  ).toBeVisible();
  expect(
    await page
      .locator(".modal")
      .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
  ).toBe(true);
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await nav.getByRole("button", { name: "Deudas", exact: true }).click();
  await page.getByRole("button", { name: "Nueva deuda", exact: true }).click();
  await page
    .getByLabel("Acreedor", { exact: true })
    .fill("Tarjeta para los gastos familiares con nombre largo");
  expect(
    await page
      .locator(".modal")
      .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
  ).toBe(true);
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await nav.getByRole("button", { name: "Apartados", exact: true }).click();
  await page
    .getByRole("button", { name: "Nuevo apartado", exact: true })
    .click();
  await page
    .getByLabel("Nombre del apartado", { exact: true })
    .fill("Meta de ahorro con nombre largo");
  await fits();
  await page
    .getByRole("button", { name: "Cancelar apartado", exact: true })
    .click();
  await nav.getByRole("button", { name: "Movimientos", exact: true }).click();
  await page
    .getByRole("button", { name: "Crear recurrente", exact: true })
    .click();
  await page
    .getByLabel("Concepto recurrente", { exact: true })
    .fill("Nuevo servicio mensual");
  await fits();
  await page
    .getByRole("button", { name: "Cancelar recurrente", exact: true })
    .click();
  await nav.getByRole("button", { name: "Reportes", exact: true }).click();
  await page.getByText("Configurar presupuesto", { exact: true }).click();
  await page.getByLabel("Límite mensual (MXN)", { exact: true }).fill("200000");
  await fits();
  await page.getByText("Configurar presupuesto", { exact: true }).click();
  await page.setViewportSize({ width: 844, height: 390 });
  await openSidebar(page);
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "Deudas", exact: true })
    .click();
  const debt = await page.locator(".debt-detail").boundingBox(),
    grid = await page.locator(".debt-grid").boundingBox();
  expect(Math.abs(debt!.width - grid!.width)).toBeLessThan(2);
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "Respaldos", exact: true })
    .click();
  const security = await page.locator(".security-panel").boundingBox(),
    backup = await page.locator(".backup-grid").boundingBox();
  expect(Math.abs(security!.width - backup!.width)).toBeLessThan(2);
});
