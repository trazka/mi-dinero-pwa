import { test, expect } from "@playwright/test";
test("en iPhone solo desplaza contenido y conserva encabezado, pestañas y acceso al final", async ({
  page,
}) => {
  await page.goto("./");
  await expect(
    page.getByRole("button", { name: "Nuevo movimiento", exact: true }),
  ).toBeEnabled();
  const content = page.locator(".page"),
    header = page.locator(".topbar"),
    nav = page.getByRole("navigation", { name: "Navegación principal" });
  const initialHeader = await header.boundingBox(),
    initialNav = await nav.boundingBox();
  await content.hover();
  await page.mouse.wheel(0, 650);
  await expect
    .poll(() => content.evaluate((el) => el.scrollTop))
    .toBeGreaterThan(100);
  expect(await header.boundingBox()).toEqual(initialHeader);
  expect(await nav.boundingBox()).toEqual(initialNav);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollHeight <= innerHeight,
    ),
  ).toBe(true);
  await nav.getByRole("button", { name: "Respaldos", exact: true }).click();
  await expect.poll(() => content.evaluate((el) => el.scrollTop)).toBe(0);
  await page
    .getByRole("button", { name: "Exportar movimientos CSV", exact: true })
    .scrollIntoViewIfNeeded();
  await expect(
    page.getByRole("button", { name: "Exportar movimientos CSV", exact: true }),
  ).toBeInViewport();
  expect(await nav.boundingBox()).toEqual(initialNav);
  await nav.getByRole("button", { name: "Movimientos", exact: true }).click();
  await page
    .getByRole("button", { name: "Nuevo movimiento", exact: true })
    .click();
  const modal = page.getByRole("dialog", {
    name: "Nuevo movimiento",
    exact: true,
  });
  await page.setViewportSize({ width: 390, height: 480 });
  await page
    .getByLabel("Notas (opcional)")
    .fill("Prueba de formulario con altura reducida");
  await modal
    .getByRole("button", { name: "Guardar", exact: true })
    .scrollIntoViewIfNeeded();
  await expect(
    modal.getByRole("button", { name: "Guardar", exact: true }),
  ).toBeInViewport();
  await expect(
    page.getByRole("button", { name: "Cerrar formulario", exact: true }),
  ).toBeInViewport();
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await page
    .getByRole("button", { name: "Cerrar formulario", exact: true })
    .click();
  await expect(modal).toBeHidden();
  await expect(nav).toBeInViewport();
});
test("la vista de escritorio conserva su desplazamiento normal", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 600 });
  await page.goto("./");
  await expect(
    page.getByRole("button", { name: "Nuevo movimiento", exact: true }),
  ).toBeEnabled();
  await page.evaluate(() => window.scrollTo(0, 500));
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(0);
  await expect(page.locator(".sidebar")).toBeInViewport();
});
