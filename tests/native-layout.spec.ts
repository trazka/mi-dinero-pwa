import { test, expect } from "@playwright/test";
test("la interfaz compacta mantiene controles visibles, navegación y formularios en iPhone", async ({
  page,
}) => {
  await page.goto("./");
  await expect(
    page.getByRole("heading", { level: 1, name: "Tu resumen" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Nuevo movimiento", exact: true }),
  ).toBeEnabled();
  const nav = page.getByRole("navigation", { name: "Navegación principal" });
  await expect(
    nav.getByRole("button", { name: "Inicio", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  const balance = await page.locator(".balance-card").boundingBox();
  expect(balance!.y + balance!.height).toBeLessThan(650);
  await page.screenshot({ path: "test-results/iphone-native-light.png" });
  await page.locator(".page").evaluate((el) => {
    el.scrollTop = 1000;
  });
  await expect
    .poll(() => page.locator(".page").evaluate((el) => el.scrollTop))
    .toBeGreaterThan(0);
  await nav.getByRole("button", { name: "Deudas", exact: true }).click();
  await expect(
    nav.getByRole("button", { name: "Deudas", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await expect
    .poll(() => page.locator(".page").evaluate((el) => el.scrollTop))
    .toBe(0);
  await expect(
    page.getByRole("heading", { level: 1, name: "Deudas" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Nueva deuda", exact: true }).click();
  const sheet = page.getByRole("dialog", { name: "Nueva deuda", exact: true });
  await expect(sheet).toBeVisible();
  await expect(sheet).toHaveCSS("border-top-left-radius", "28px");
  await page.getByLabel("Acreedor", { exact: true }).fill("Prueba de interfaz");
  await page.getByLabel("Fecha de vencimiento", { exact: true }).click();
  await page.getByRole("button", { name: "Hoy", exact: true }).click();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(sheet).toBeHidden();
  await page.getByRole("button", { name: "Apariencia", exact: true }).click();
  await page
    .getByRole("dialog", { name: "Apariencia", exact: true })
    .getByRole("button", { name: "Oscuro", exact: true })
    .click();
  await nav.getByRole("button", { name: "Inicio", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.screenshot({ path: "test-results/iphone-native-dark.png" });
  await page.setViewportSize({ width: 320, height: 740 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  for (const name of [
    "Inicio",
    "Movimientos",
    "Deudas",
    "Reportes",
    "Respaldos",
  ])
    await expect(
      nav.getByRole("button", { name, exact: true }),
    ).toBeInViewport();
});
