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
  // The in-app wallet and the installed launcher are intentionally different.
  await expect(page.locator(".app-identity img")).toHaveAttribute(
    "src",
    "/mi-dinero-pwa/icon-v2.svg",
  );
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
    "href",
    "/mi-dinero-pwa/apple-touch-icon-v5.png",
  );
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

test("el espacio horizontal prioriza el panel y mantiene márgenes alineados", async ({
  page,
}) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto("./");
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "Reportes", exact: true })
    .click();
  await page.getByRole("button", { name: "Cerrar aviso", exact: true }).click();
  for (const width of [844, 960]) {
    await page.setViewportSize({ width, height: 390 });
    const sidebar = await page.locator(".sidebar").boundingBox();
    const topbar = await page.locator(".topbar").boundingBox();
    const heading = await page.locator(".page-heading").boundingBox();
    const panel = await page.locator(".full-panel").boundingBox();
    expect(sidebar!.width).toBe(184);
    expect(topbar!.height).toBe(64);
    expect(topbar!.x).toBe(sidebar!.width);
    expect(heading!.x).toBe(panel!.x);
    expect(panel!.y).toBeLessThan(180);
    await expect(page.locator(".sidebar-note")).toBeHidden();
    for (const name of [
      "Inicio",
      "Movimientos",
      "Deudas",
      "Apartados",
      "Reportes",
      "Respaldos",
    ])
      await expect(
        page.locator(".sidebar").getByRole("button", { name, exact: true }),
      ).toBeInViewport();
  }
  await page.screenshot({
    path: "test-results/reportes-horizontal-proporcionado.png",
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(page.locator(".topbar")).toHaveCSS("height", "89px");
  await expect(page.locator(".sidebar-note")).toBeVisible();
});

test("el menú horizontal se oculta y se muestra sin perder sección ni navegación vertical", async ({
  page,
}) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto("./");
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "Apartados", exact: true })
    .click();
  const toggle = page.locator(".sidebar-toggle");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  const before = await page.locator("main").boundingBox();
  await page
    .getByRole("button", { name: "Ocultar menú lateral", exact: true })
    .click();
  await expect(page.locator(".sidebar")).toBeHidden();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator(".page h1")).toHaveText("Apartados");
  const after = await page.locator("main").boundingBox();
  expect(after!.x).toBe(0);
  expect(after!.width).toBeGreaterThan(before!.width);
  await toggle.press("Enter");
  await expect(page.locator(".sidebar")).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await page
    .getByRole("button", { name: "Ocultar menú lateral", exact: true })
    .click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(toggle).toBeHidden();
  await page
    .getByRole("navigation", { name: "Navegación principal" })
    .getByRole("button", { name: "Movimientos", exact: true })
    .click();
  await expect(page.locator(".page h1")).toHaveText("Movimientos");
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(
    page.getByRole("button", { name: "Mostrar menú lateral", exact: true }),
  ).toBeVisible();
  await toggle.click();
  await expect(page.locator(".sidebar")).toBeVisible();
  await expect(page.locator(".page h1")).toHaveText("Movimientos");
});
