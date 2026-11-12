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

test("rotar con desplazamiento de escritorio restaura encabezado y altura vertical", async ({
  page,
}) => {
  await page.goto("./");
  await expect(page.locator(".topbar")).toBeVisible();
  for (let rotation = 0; rotation < 2; rotation++) {
    await page.setViewportSize({ width: 844, height: 390 });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeGreaterThan(0);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    await expect(page.locator(".topbar")).toBeInViewport();
    const app = await page.locator(".app").boundingBox();
    const nav = await page.locator(".mobile-nav").boundingBox();
    expect(app!.y).toBe(0);
    expect(app!.height).toBe(844);
    expect(nav!.y + nav!.height).toBe(844);
    await page.locator(".page").evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    await expect(page.locator(".topbar")).toBeInViewport();
  }
});

test("al regresar a la app recupera la altura y los toques del menú sin eventos resize", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./");
  await expect(page.locator(".page h1")).toHaveText("Tu resumen");
  const nav = page.getByRole("navigation", { name: "Navegación principal" });
  for (const event of ["visibilitychange", "pageshow", "focus"]) {
    await page.evaluate((event) => {
      // Simulate a stale viewport left by backgrounding the standalone PWA.
      document.documentElement.style.setProperty("--app-height", "1200px");
      if (event === "visibilitychange") {
        Object.defineProperty(document, "hidden", {
          configurable: true,
          value: true,
        });
        document.dispatchEvent(new Event("visibilitychange"));
        Reflect.deleteProperty(document, "hidden");
        document.dispatchEvent(new Event("visibilitychange"));
      } else
        window.dispatchEvent(
          event === "pageshow"
            ? new PageTransitionEvent("pageshow", { persisted: true })
            : new Event("focus"),
        );
    }, event);
    await expect
      .poll(() =>
        page
          .locator(".app")
          .evaluate((el) => el.getBoundingClientRect().height),
      )
      .toBe(844);
    for (const name of [
      "Movimientos",
      "Deudas",
      "Apartados",
      "Reportes",
      "Respaldos",
      "Inicio",
    ]) {
      await nav.getByRole("button", { name, exact: true }).tap();
      await expect(page.locator(".page h1")).toHaveText(
        name === "Inicio" ? "Tu resumen" : name,
      );
    }
  }
});

test("capturar con teclado oculta navegación y sigue el área visual sin perder texto", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./");
  const nav = page.getByRole("navigation", { name: "Navegación principal" });
  await nav.getByRole("button", { name: "Movimientos", exact: true }).click();
  const search = page.getByLabel("Buscar movimientos", { exact: true });
  await search.fill("Texto conservado");
  // Hide immediately, even before the visual viewport reports a keyboard.
  await expect(nav).toBeHidden();
  await page.evaluate(() => {
    Object.defineProperty(window.visualViewport!, "height", {
      configurable: true,
      value: 390,
    });
    Object.defineProperty(window.visualViewport!, "offsetTop", {
      configurable: true,
      value: 100,
    });
    window.visualViewport!.dispatchEvent(new Event("resize"));
    window.visualViewport!.dispatchEvent(new Event("scroll"));
  });
  await expect(nav).toBeHidden();
  await expect(page.locator(".section-add")).toBeHidden();
  await expect
    .poll(() =>
      page.locator(".app").evaluate((el) => el.getBoundingClientRect().height),
    )
    .toBe(390);
  await expect
    .poll(() =>
      page.locator(".app").evaluate((el) => el.getBoundingClientRect().top),
    )
    .toBe(100);
  await expect(search).toBeInViewport();
  await expect(search).toHaveValue("Texto conservado");
  await page.getByRole("button", { name: "Listo", exact: true }).click();
  await page.evaluate(() => {
    Reflect.deleteProperty(window.visualViewport!, "height");
    Reflect.deleteProperty(window.visualViewport!, "offsetTop");
    window.visualViewport!.dispatchEvent(new Event("resize"));
  });
  await expect(nav).toBeVisible();
  await expect
    .poll(() =>
      page.locator(".app").evaluate((el) => el.getBoundingClientRect().height),
    )
    .toBe(844);
  await expect
    .poll(() =>
      page.locator(".app").evaluate((el) => el.getBoundingClientRect().top),
    )
    .toBe(0);
  await nav.getByRole("button", { name: "Deudas", exact: true }).tap();
  await expect(page.locator(".page h1")).toHaveText("Deudas");
});
