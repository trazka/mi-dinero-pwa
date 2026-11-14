import { test, expect } from "@playwright/test";
import { openSidebar } from "./layout-utils";

test("Apartados a Inicio desliza directamente hacia atrás al tocar la barra", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("./");
  const nav = page.getByRole("navigation", { name: "Navegación principal" });
  await nav.getByRole("button", { name: "Apartados", exact: true }).click();
  await expect(page.locator(".page h1")).toHaveText("Apartados");
  await page.evaluate(() => {
    const original = Element.prototype.animate;
    Element.prototype.animate = function (keyframes, options) {
      const animation = original.call(this, keyframes, options);
      animation.pause();
      animation.currentTime = 80;
      return animation;
    };
  });
  const bounds = await nav.boundingBox();
  await nav.getByRole("button", { name: "Inicio", exact: true }).click();
  await expect(page.locator(".page h1")).toHaveText("Apartados");
  await expect(page.locator(".page-preview-content h1")).toHaveText(
    "Tu espacio",
  );
  expect(
    (await page.locator(".page-preview-content").boundingBox())!.x,
  ).toBeLessThan(0);
  expect(
    (await page.locator(".page .page-heading-content").boundingBox())!.x,
  ).toBeGreaterThan(20);
  expect(await nav.boundingBox()).toEqual(bounds);
  await page.evaluate(() =>
    document.getAnimations().forEach((animation) => animation.play()),
  );
  await expect(page.locator(".page h1")).toHaveText("Tu espacio");
  await expect(page.locator(".page-preview-content h1")).toHaveCount(0);
});

test("el último botón elegido gana y Reducir movimiento permite el cambio inmediato", async ({
  page,
}) => {
  await page.goto("./");
  const nav = page.getByRole("navigation", { name: "Navegación principal" });
  await nav.getByRole("button", { name: "Deudas", exact: true }).click();
  await nav.getByRole("button", { name: "Reportes", exact: true }).click();
  await expect(page.locator(".page h1")).toHaveText("Reportes");
  await expect(page.locator(".page-preview-content h1")).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await nav.getByRole("button", { name: "Inicio", exact: true }).click();
  await expect(page.locator(".page h1")).toHaveText("Tu espacio");
  await expect(page.locator(".page-preview-content h1")).toHaveCount(0);
});

test("la navegación lateral horizontal también anima y deja operativo el botón más", async ({
  page,
}) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto("./");
  await openSidebar(page);
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "Apartados", exact: true })
    .click();
  await expect(page.locator(".page h1")).toHaveText("Apartados");
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "Inicio", exact: true })
    .click();
  await expect(page.locator(".page h1")).toHaveText("Tu espacio");
  await page
    .getByRole("button", { name: "Nuevo movimiento", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Nuevo movimiento", exact: true }),
  ).toBeVisible();
});
