import { test, expect } from "@playwright/test";
async function appearance(page: import("@playwright/test").Page, name: string) {
  await page.getByRole("button", { name: "Apariencia", exact: true }).click();
  await page
    .getByRole("dialog", { name: "Apariencia", exact: true })
    .getByRole("button", { name, exact: true })
    .click();
}
test("apariencia automática sigue al iPhone, selección manual persiste y funciona sin internet", async ({
  page,
  context,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("./");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(
    page.getByRole("button", { name: "Nuevo movimiento", exact: true }),
  ).toBeEnabled();
  await appearance(page, "Claro");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await appearance(page, "Oscuro");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
    "content",
    "#0e1814",
  );
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const nav = page.getByRole("navigation", { name: "Navegación principal" });
  for (const name of [
    "Movimientos",
    "Deudas",
    "Reportes",
    "Respaldos",
    "Inicio",
  ]) {
    await nav.getByRole("button", { name, exact: true }).click();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }
  await page
    .getByRole("button", { name: "Nuevo movimiento", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCSS(
    "background-color",
    "rgb(24, 39, 31)",
  );
  await page.getByLabel("Fecha", { exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Seleccionar fecha", exact: true }),
  ).toHaveCSS("background-color", "rgb(24, 39, 31)");
  await page.getByRole("button", { name: "Cerrar calendario" }).click();
  await page.getByRole("button", { name: "Cerrar formulario" }).click();
  await appearance(page, "Automático");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/iphone-dark.png",
    fullPage: true,
  });
});
test("el modo nocturno sigue funcionando cuando no se puede guardar la preferencia", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new DOMException("No disponible", "SecurityError");
      },
    });
  });
  await page.goto("./");
  await appearance(page, "Oscuro");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});
