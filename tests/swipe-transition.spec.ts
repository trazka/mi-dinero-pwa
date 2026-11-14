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
      expect(await frames()).toContain("translateX(28px)");
    else expect(await frames()).toEqual([]);
    await expect(page.locator(".section-add")).toBeInViewport();
    expect(await nav.boundingBox()).toEqual(navBefore);
    await swipe(140);
    await expect(page.locator(".page h1")).toHaveText("Tu espacio");
    if (reducedMotion === "no-preference")
      expect(await frames()).toContain("translateX(-28px)");
    else expect(await frames()).toEqual([]);
    // A rapid change must not leave the new section faded or displaced.
    await swipe(-140);
    await swipe(-140);
    await expect(page.locator(".page h1")).toHaveText("Deudas");
    await expect
      .poll(() =>
        page
          .locator(".page-heading-content")
          .evaluate((el) => getComputedStyle(el).transform),
      )
      .toBe("none");
    await page.locator(".section-add").click();
    await expect(
      page.getByRole("dialog", { name: "Nueva deuda", exact: true }),
    ).toBeVisible();
  });
}
