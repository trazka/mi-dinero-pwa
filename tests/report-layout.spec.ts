import { test, expect } from "@playwright/test";

test("Reportes muestra resultados antes de controles y presupuesto cerrado", async ({
  page,
}) => {
  await page.goto("./");
  const nav = page.getByRole("navigation", { name: "Navegación principal" });
  await nav.getByRole("button", { name: "Reportes", exact: true }).click();
  await expect(page.locator(".page-preview-content h1")).toHaveCount(0);
  const budget = page.locator(".page .report-budget");
  const filters = page.locator(".page .report-filters");
  await expect(budget).not.toHaveAttribute("open");
  await expect(filters).not.toHaveAttribute("open");
  await expect(page.getByLabel("Agrupar por")).toBeHidden();
  await expect(page.locator(".report-range")).toBeVisible();
  const resultY = (await page.locator(".report-range").boundingBox())!.y;
  expect((await filters.boundingBox())!.y).toBeGreaterThan(resultY);
  await filters.locator(":scope > summary").click();
  await page.getByLabel("Agrupar por").selectOption("daily");
  await filters.locator(":scope > summary").click();
  await expect(page.getByLabel("Agrupar por")).toBeHidden();
  await budget.locator(":scope > summary").click();
  await page.getByText("Configurar presupuesto", { exact: true }).click();
  await expect(page.getByLabel("Límite mensual (MXN)")).toBeVisible();
  await budget.locator(":scope > summary").click();
  await expect(page.getByLabel("Límite mensual (MXN)")).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Nuevo movimiento", exact: true }),
  ).toBeEnabled();
  await nav.getByRole("button", { name: "Inicio", exact: true }).click();
  await expect(page.locator(".page h1")).toHaveText("Tu espacio");
  await nav.getByRole("button", { name: "Reportes", exact: true }).click();
  await expect(page.locator(".page-preview-content h1")).toHaveCount(0);
  await expect(budget).not.toHaveAttribute("open");
  await expect(filters).not.toHaveAttribute("open");
});
