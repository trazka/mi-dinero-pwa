import { test, expect } from "@playwright/test";

test("sugerencias permiten conceptos nuevos y conservan los registros", async ({
  page,
}) => {
  await page.goto("./");
  for (const concept of ["Tienda de prueba", "Concepto completamente nuevo"]) {
    await page
      .getByRole("button", { name: "Nuevo movimiento", exact: true })
      .click();
    await page
      .getByLabel("Establecimiento o concepto", { exact: true })
      .fill(concept);
    await page.getByLabel("Importe (MXN)", { exact: true }).fill("100");
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
  await page.reload();
  await page
    .getByRole("button", { name: "Nuevo movimiento", exact: true })
    .click();
  await expect(
    page.getByLabel("Establecimiento o concepto", { exact: true }),
  ).toHaveAttribute("list", "merchant-suggestions");
  await expect(
    page.locator('#merchant-suggestions option[value="Tienda de prueba"]'),
  ).toHaveCount(1);
  await expect(
    page.locator(
      '#merchant-suggestions option[value="Concepto completamente nuevo"]',
    ),
  ).toHaveCount(1);
});

test("gestos cambian sección y el botón flotante sigue su contexto", async ({
  page,
}) => {
  await page.goto("./");
  const content = page.locator(".page");
  async function swipe(dx: number, dy = 0) {
    await content.dispatchEvent("touchstart", {
      touches: [{ identifier: 1, clientX: 250, clientY: 250 }],
    });
    await content.dispatchEvent("touchend", {
      changedTouches: [{ identifier: 1, clientX: 250 + dx, clientY: 250 + dy }],
    });
  }
  await swipe(-140, 150);
  await expect(page.locator(".page h1")).toHaveText("Tu resumen");
  await swipe(-140);
  await expect(page.locator(".page h1")).toHaveText("Movimientos");
  await swipe(-140);
  await expect(page.locator(".page h1")).toHaveText("Deudas");
  await expect(page.locator(".section-add")).toBeInViewport();
  await page.locator(".section-add").click();
  await expect(
    page.getByRole("dialog", { name: "Nueva deuda", exact: true }),
  ).toBeVisible();
  await swipe(-140);
  await expect(page.locator(".page h1")).toHaveText("Deudas");
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await swipe(-140);
  await expect(page.locator(".page h1")).toHaveText("Apartados");
  await expect(page.locator(".section-add")).toHaveText("Nuevo apartado");
  await swipe(-140);
  await swipe(-140);
  await expect(page.locator(".page h1")).toHaveText("Respaldos");
  await expect(page.locator(".section-add")).toHaveCount(0);
});

test("menú lateral horizontal no muestra tarjetas decorativas recortadas", async ({
  page,
}) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto("./");
  await expect(page.locator(".sidebar-note")).toBeHidden();
  await expect(page.locator(".sidebar-bottom")).toBeHidden();
  await expect(
    page
      .locator(".sidebar")
      .getByRole("button", { name: "Respaldos", exact: true }),
  ).toBeInViewport();
  await page.setViewportSize({ width: 1200, height: 900 });
  await expect(page.locator(".sidebar-note")).toBeVisible();
});
