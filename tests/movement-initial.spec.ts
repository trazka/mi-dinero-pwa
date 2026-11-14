import { test, expect, type Page } from "@playwright/test";
import { setBackupFile } from "./backup-utils";
import { revealHomeSummary } from "./home-utils";
async function seed(page: Page) {
  await page.goto("./");
  await page
    .getByRole("navigation", { name: "Navegación principal" })
    .getByRole("button", { name: "Respaldos", exact: true })
    .click();
  page.once("dialog", (d) => d.accept());
  const base = {
    date: "2026-11-12",
    method: "Transferencia",
    notes: "",
    category: "Otros",
  };
  await setBackupFile(page, {
    name: "movements.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        version: 2,
        debts: [],
        movements: [
          {
            ...base,
            id: "income",
            type: "income",
            merchant: "Ingreso privado",
            amount: 1000,
          },
          {
            ...base,
            id: "expense",
            type: "expense",
            merchant: "Gasto privado",
            amount: 50,
          },
        ],
        recurrents: [
          {
            id: "recurring",
            merchant: "Servicio recurrente",
            amount: 20,
            method: "Efectivo",
            category: "Hogar",
            frequency: "monthly",
            anchorDay: 19,
            nextDate: "2099-11-19",
            active: true,
          },
        ],
        pendingMovements: [
          {
            ...base,
            id: "pending",
            type: "expense",
            merchant: "Pago pendiente",
            date: "2099-11-19",
            amount: 10,
          },
        ],
      }),
    ),
  });
  await expect(page.getByRole("status")).toContainText("Datos guardados");
}
test("Movimientos empieza sin seleccionar y solo muestra el listado al elegir una opción", async ({
  page,
}) => {
  await seed(page);
  const nav = page.getByRole("navigation", { name: "Navegación principal" });
  await nav.getByRole("button", { name: "Movimientos", exact: true }).click();
  const tabs = page.getByRole("tablist", { name: "Mostrar movimientos" });
  const results = page.locator(".page .movement-results");
  await expect(tabs.locator('[aria-selected="true"]')).toHaveCount(0);
  await expect(results).toHaveText(
    "Elige una opción para ver tus movimientos.",
  );
  await expect(
    results.locator(
      ".movement,.movement-totals,.panel-heading,.export-actions",
    ),
  ).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "Movimientos pendientes" }),
  ).toContainText("Pago pendiente");
  await expect(page.locator(".page .recurring-item summary")).toHaveText(
    "Servicio recurrente",
  );
  await page
    .getByRole("button", { name: "Limpiar filtros", exact: true })
    .click();
  await expect(tabs.locator('[aria-selected="true"]')).toHaveCount(0);
  await page
    .getByRole("button", { name: "Nuevo movimiento", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Tipo", { exact: true }).selectOption("income");
  await dialog.getByLabel("Establecimiento o concepto").fill("Ingreso nuevo");
  await dialog.getByLabel("Importe (MXN)", { exact: true }).fill("20");
  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(results.locator(".movement")).toHaveCount(0);
  const all = tabs.getByRole("tab", { name: "Todos", exact: true });
  await expect(all).toHaveAttribute("tabindex", "0");
  await all.focus();
  await all.press("Enter");
  await expect(all).toHaveAttribute("aria-selected", "true");
  await expect(results.locator(".movement")).toHaveCount(3);
  await expect(
    results.getByRole("button", { name: "Excel", exact: true }),
  ).toBeEnabled();
  await all.press("ArrowRight");
  await expect(
    tabs.getByRole("tab", { name: "Ingresos", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(results.locator(".movement")).toHaveCount(2);
  await expect(results).not.toContainText("Gasto privado");
  await tabs.getByRole("tab", { name: "Gastos", exact: true }).click();
  await expect(results.locator(".movement-info > strong")).toHaveText([
    "Gasto privado",
  ]);
  await nav.getByRole("button", { name: "Inicio", exact: true }).click();
  await nav.getByRole("button", { name: "Movimientos", exact: true }).click();
  await expect(
    tabs.getByRole("tab", { name: "Gastos", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.reload();
  await page
    .getByRole("button", { name: "Consultar movimientos", exact: true })
    .click();
  await expect(tabs.locator('[aria-selected="true"]')).toHaveCount(0);
  await expect(results.locator(".movement")).toHaveCount(0);
  await nav.getByRole("button", { name: "Inicio", exact: true }).click();
  await revealHomeSummary(page);
  await page.getByRole("button", { name: "Ver ingresos", exact: true }).click();
  await expect(
    tabs.getByRole("tab", { name: "Ingresos", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(results.locator(".movement")).toHaveCount(2);
});
test("la vista previa al deslizar tampoco muestra movimientos antes de elegir", async ({
  page,
}) => {
  await seed(page);
  await page
    .getByRole("navigation", { name: "Navegación principal" })
    .getByRole("button", { name: "Inicio", exact: true })
    .click();
  const content = page.locator(".page");
  await expect(content.locator("h1")).toHaveText("Tu espacio");
  await content.dispatchEvent("touchstart", {
    touches: [{ identifier: 1, clientX: 280, clientY: 240 }],
  });
  await content.dispatchEvent("touchmove", {
    touches: [{ identifier: 1, clientX: 200, clientY: 240 }],
  });
  const preview = page.locator(".page-preview-content");
  await expect(preview.locator("h1")).toHaveText("Movimientos");
  await expect(preview.locator(".movement-selection-prompt")).toBeVisible();
  await expect(
    preview.locator(".movement,.movement-totals,.export-actions"),
  ).toHaveCount(0);
  await content.dispatchEvent("touchend", {
    changedTouches: [{ identifier: 1, clientX: 120, clientY: 240 }],
  });
  await expect(content.locator("h1")).toHaveText("Movimientos");
  await expect(content.locator(".movement")).toHaveCount(0);
});
