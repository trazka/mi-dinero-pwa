import { test, expect } from "@playwright/test";

for (const reducedMotion of ["no-preference", "reduce"] as const) {
  test(`deslizamiento anima según dirección y respeta movimiento ${reducedMotion}`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion });
    await page.addInitScript(() => {
      const frames: string[] = [];
      Object.assign(window, { sectionAnimationFrames: frames });
      const original = Element.prototype.animate;
      Element.prototype.animate = function (keyframes, options) {
        if (Array.isArray(keyframes))
          frames.push(String(keyframes[0]?.transform ?? ""));
        return original.call(this, keyframes, options);
      };
    });
    await page.goto("./");
    const content = page.locator(".page");
    await expect(
      page.getByRole("button", { name: "Nuevo movimiento", exact: true }),
    ).toBeEnabled();
    const nav = page.getByRole("navigation", { name: "Navegación principal" });
    const navBefore = await nav.boundingBox();
    const pageWidth = await content.evaluate(
      (el) => el.getBoundingClientRect().width,
    );
    const frames = () =>
      page.evaluate(
        () =>
          (window as Window & { sectionAnimationFrames: string[] })
            .sectionAnimationFrames,
      );
    async function swipe(dx: number) {
      await content.dispatchEvent("touchstart", {
        touches: [{ identifier: 1, clientX: 200, clientY: 250 }],
      });
      await content.dispatchEvent("touchend", {
        changedTouches: [{ identifier: 1, clientX: 200 + dx, clientY: 250 }],
      });
    }
    await swipe(-140);
    await expect(page.locator(".page h1")).toHaveText("Movimientos");
    if (reducedMotion === "no-preference")
      expect(await frames()).toContain(`translateX(${pageWidth}px)`);
    else expect(await frames()).toEqual([]);
    await expect(page.locator(".section-add")).toBeInViewport();
    expect(await nav.boundingBox()).toEqual(navBefore);
    await swipe(140);
    await expect(page.locator(".page h1")).toHaveText("Tu espacio");
    if (reducedMotion === "no-preference")
      expect(await frames()).toContain(`translateX(${-pageWidth}px)`);
    else expect(await frames()).toEqual([]);
    // A rapid change must not leave the new section faded or displaced.
    await swipe(-140);
    await swipe(-140);
    await expect(page.locator(".page h1")).toHaveText("Deudas");
    await expect
      .poll(() =>
        page
          .locator(".page .page-heading-content")
          .evaluate((el) => getComputedStyle(el).transform),
      )
      .toBe("none");
    await expect(page.locator(".page-transition-snapshot")).toHaveCount(0);
    await page.locator(".section-add").click();
    await expect(
      page.getByRole("dialog", { name: "Nueva deuda", exact: true }),
    ).toBeVisible();
  });
}

test("se ven salir y entrar ambas páginas; girar limpia la transición", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => {
    const original = Element.prototype.animate;
    Element.prototype.animate = function (keyframes, options) {
      const animation = original.call(this, keyframes, options);
      animation.pause();
      animation.currentTime = 80;
      return animation;
    };
  });
  await page.goto("./");
  await expect(
    page.getByRole("button", { name: "Nuevo movimiento", exact: true }),
  ).toBeEnabled();
  const content = page.locator(".page");
  const nav = page.getByRole("navigation", { name: "Navegación principal" });
  const navBefore = await nav.boundingBox();
  await content.dispatchEvent("touchstart", {
    touches: [{ identifier: 1, clientX: 200, clientY: 250 }],
  });
  await content.dispatchEvent("touchend", {
    changedTouches: [{ identifier: 1, clientX: 60, clientY: 250 }],
  });
  await expect(content.locator("h1")).toHaveText("Movimientos");
  const snapshot = page.locator(".page-transition-snapshot");
  await expect(snapshot).toHaveAttribute("aria-hidden", "true");
  expect(await snapshot.evaluate((el) => (el as HTMLElement).inert)).toBe(true);
  await expect(snapshot.locator("h1")).toHaveText("Tu espacio");
  await expect(snapshot.locator(".section-add")).toHaveCount(0);
  const outgoing = await snapshot
    .locator(".page-snapshot-content")
    .boundingBox();
  const incoming = await content.locator(".page-heading-content").boundingBox();
  expect(outgoing!.x).toBeLessThan(0);
  expect(incoming!.x).toBeGreaterThan(30);
  expect(incoming!.x).toBeLessThan(390);
  expect(await nav.boundingBox()).toEqual(navBefore);
  await page.screenshot({
    path: test.info().outputPath("cambio-de-pagina.png"),
  });
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(snapshot).toHaveCount(0);
  await expect
    .poll(() =>
      content
        .locator(".page-heading-content")
        .evaluate((el) => getComputedStyle(el).transform),
    )
    .toBe("none");
});
