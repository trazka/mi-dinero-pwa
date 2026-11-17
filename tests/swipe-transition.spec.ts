import { openAdvancedFilters } from "./filter-utils";
import { openBudget } from "./report-utils";
import { test, expect, type Locator } from "@playwright/test";
import { setBackupFile } from "./backup-utils";

async function touch(
  target: Locator,
  type: "touchstart" | "touchmove" | "touchend",
  x: number,
  y = 240,
) {
  const point = { identifier: 1, clientX: x, clientY: y };
  await target.dispatchEvent(type, {
    bubbles: true,
    cancelable: true,
    touches: type === "touchend" ? [] : [point],
    changedTouches: [point],
  });
}

test("la página sigue al dedo y muestra la vecina antes de soltar; un arrastre corto vuelve", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("./");
  const content = page.locator(".page"),
    preview = page.locator(".page-preview-content");
  await expect(
    page.getByRole("button", { name: "Nuevo movimiento", exact: true }),
  ).toBeEnabled();
  const nav = page.getByRole("navigation", { name: "Navegación principal" });
  const navBefore = await nav.boundingBox();
  await touch(content, "touchstart", 280);
  await touch(content, "touchmove", 230);
  await expect(content.locator("h1")).toHaveText("Tu espacio");
  await expect(preview.locator("h1")).toHaveText("Movimientos");
  await expect(
    nav.getByRole("button", { name: "Inicio", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    nav.getByRole("button", { name: "Movimientos", exact: true }),
  ).not.toHaveAttribute("aria-current");
  await expect(page.locator(".page-preview-frame")).toHaveAttribute(
    "aria-hidden",
    "true",
  );
  expect(
    await page
      .locator(".page-preview-frame")
      .evaluate((el) => (el as HTMLElement).inert),
  ).toBe(true);
  await expect(preview.locator(".section-add")).toHaveCount(0);
  const first = await preview.boundingBox();
  await touch(content, "touchmove", 190);
  const second = await preview.boundingBox();
  expect(Math.round(first!.x - second!.x)).toBe(40);
  expect(await nav.boundingBox()).toEqual(navBefore);
  await page.screenshot({
    path: test.info().outputPath("pagina-sigue-al-dedo.png"),
  });
  await touch(content, "touchmove", 265);
  await touch(content, "touchend", 265);
  await expect(preview.locator("h1")).toHaveCount(0);
  await expect(content.locator("h1")).toHaveText("Tu espacio");
  await expect(
    nav.getByRole("button", { name: "Inicio", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    nav.getByRole("button", { name: "Movimientos", exact: true }),
  ).not.toHaveAttribute("aria-current");
  await expect
    .poll(() =>
      content
        .locator(".page-heading-content")
        .evaluate((el) => getComputedStyle(el).transform),
    )
    .toBe("none");
  await touch(content, "touchstart", 280);
  await touch(content, "touchmove", 120);
  // There is no old 1.2-second timeout for a deliberate slow drag.
  await page.waitForTimeout(1300);
  await touch(content, "touchend", 120);
  await expect(content.locator("h1")).toHaveText("Movimientos");
  await expect(preview.locator("h1")).toHaveCount(0);
  await touch(content, "touchstart", 80);
  await touch(content, "touchmove", 180);
  await expect(preview.locator("h1")).toHaveText("Tu espacio");
  await touch(content, "touchend", 240);
  await expect(content.locator("h1")).toHaveText("Tu espacio");
});

test("reducir movimiento conserva los gestos sin desplazar contenido", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./");
  await expect(
    page.getByRole("button", { name: "Nuevo movimiento", exact: true }),
  ).toBeEnabled();
  const content = page.locator(".page");
  await touch(content, "touchstart", 280);
  await touch(content, "touchmove", 130);
  await expect(page.locator(".page-preview-content h1")).toHaveCount(0);
  expect(
    await content
      .locator(".page-heading-content")
      .evaluate((el) => getComputedStyle(el).transform),
  ).toBe("none");
  await touch(content, "touchend", 130);
  await expect(content.locator("h1")).toHaveText("Movimientos");
});

test("un arrastre cancelado conserva filtros y el mes de presupuesto; girar o cancelar limpia la vista", async ({
  page,
}) => {
  await page.goto("./");
  const nav = page.getByRole("navigation", { name: "Navegación principal" });
  await nav.getByRole("button", { name: "Reportes", exact: true }).click();
  await openBudget(page);
  await page
    .getByRole("button", { name: "Presupuesto del mes anterior" })
    .click();
  const month = await page.locator(".page .month-switch strong").innerText();
  const content = page.locator(".page"),
    preview = page.locator(".page-preview-content");
  await touch(content, "touchstart", 280);
  await touch(content, "touchmove", 200);
  await expect(preview.locator("h1")).toHaveText("Respaldos");
  await touch(content, "touchmove", 270);
  await touch(content, "touchend", 270);
  await expect(preview.locator("h1")).toHaveCount(0);
  await expect(page.locator(".page .month-switch strong")).toHaveText(month);
  await touch(content, "touchstart", 100);
  await touch(content, "touchmove", 190);
  await expect(preview.locator("h1")).toHaveText("Apartados");
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(preview.locator("h1")).toHaveCount(0);
  await expect(content.locator("h1")).toHaveText("Reportes");
  expect(
    await content
      .locator(".page-heading-content")
      .evaluate((el) => getComputedStyle(el).transform),
  ).toBe("none");
});

test("deslizar sobre botones y campos inactivos no ejecuta su toque y escribir conserva el gesto", async ({
  page,
}) => {
  await page.goto("./");
  const button = page.getByRole("button", {
    name: "Registrar un abono",
    exact: true,
  });
  await expect(button).toBeEnabled();
  const pressed = await button.elementHandle();
  await touch(button, "touchstart", 280);
  await touch(button, "touchmove", 130);
  await expect(page.locator(".page-preview-content h1")).toHaveText(
    "Movimientos",
  );
  await touch(button, "touchend", 130);
  await pressed!.dispatchEvent("click", {
    bubbles: true,
    cancelable: true,
    detail: 1,
  });
  await expect(page.locator(".page h1")).toHaveText("Movimientos");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await openAdvancedFilters(page);
  await page.getByRole("tab", { name: "Todos", exact: true }).click();
  const input = page.getByLabel("Buscar movimientos", { exact: true });
  await input.fill("Concepto de prueba");
  await touch(input, "touchstart", 280);
  await touch(input, "touchmove", 130);
  await touch(input, "touchend", 130);
  await expect(page.locator(".page h1")).toHaveText("Movimientos");
  await expect(input).toHaveValue("Concepto de prueba");
  await input.evaluate((el) => (el as HTMLElement).blur());
  await touch(input, "touchstart", 280);
  await touch(input, "touchmove", 130);
  await touch(input, "touchend", 130);
  await expect(page.locator(".page h1")).toHaveText("Deudas");
});

test("toques nativos desde un botón siguen el dedo y no abren el formulario", async ({
  page,
  context,
  browserName,
}) => {
  test.skip(
    browserName !== "chromium",
    "Los eventos táctiles nativos CDP corresponden a Chromium.",
  );
  await page.goto("./");
  const button = page.getByRole("button", {
    name: "Registrar un abono",
    exact: true,
  });
  await expect(button).toBeEnabled();
  const rect = (await button.boundingBox())!;
  const x = rect.x + rect.width - 30,
    y = rect.y + rect.height / 2;
  const cdp = await context.newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y }],
  });
  for (let step = 1; step <= 5; step++)
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: x - step * 25, y: y + step * 2 }],
    });
  await expect(page.locator(".page h1")).toHaveText("Tu espacio");
  await expect(page.locator(".page-preview-content h1")).toHaveText(
    "Movimientos",
  );
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect(page.locator(".page h1")).toHaveText("Movimientos");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("una tabla ancha conserva su desplazamiento y permite salir al llegar al borde", async ({
  page,
}) => {
  await page.goto("./");
  const nav = page.getByRole("navigation", { name: "Navegación principal" });
  await nav.getByRole("button", { name: "Respaldos", exact: true }).click();
  page.once("dialog", (d) => d.accept());
  const base = {
    date: "2026-11-14",
    merchant: "Concepto de prueba",
    category: "Otros",
    method: "Efectivo",
    notes: "",
  };
  await setBackupFile(page, {
    name: "table.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        version: 2,
        debts: [],
        movements: [
          { ...base, id: "i", type: "income", amount: 1000000 },
          { ...base, id: "e", type: "expense", amount: 100000 },
        ],
      }),
    ),
  });
  await expect(page.getByRole("status")).toContainText("Datos guardados");
  await nav.getByRole("button", { name: "Reportes", exact: true }).click();
  await page.setViewportSize({ width: 320, height: 844 });
  await page.locator(".page .report-periods").evaluate((el) => {
    const fixture = document.createElement("div");
    fixture.className = "table-scroll gesture-table-fixture";
    fixture.style.overflow = "auto";
    fixture.innerHTML =
      '<table style="min-width:800px"><tbody><tr><td>Tabla ancha de prueba</td></tr></tbody></table>';
    el.append(fixture);
  });
  const table = page.locator(".page .gesture-table-fixture");
  expect(
    await table.evaluate((el) => el.scrollWidth > el.clientWidth + 2),
  ).toBe(true);
  await table.evaluate((el) => {
    el.scrollLeft = 0;
  });
  await touch(table, "touchstart", 260);
  await touch(table, "touchmove", 120);
  await touch(table, "touchend", 120);
  await expect(page.locator(".page h1")).toHaveText("Reportes");
  await expect(page.locator(".page-preview-content h1")).toHaveCount(0);
  await table.evaluate((el) => {
    el.scrollLeft = el.scrollWidth - el.clientWidth;
  });
  await touch(table, "touchstart", 260);
  await touch(table, "touchmove", 120);
  await expect(page.locator(".page-preview-content h1")).toHaveText(
    "Respaldos",
  );
  await touch(table, "touchend", 120);
  await expect(page.locator(".page h1")).toHaveText("Respaldos");
});

test("el botón más permanece fijo y visible durante el arrastre y al cambiar su acción", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("./");
  const add = page.locator(".section-add");
  await expect(add).toBeEnabled();
  const original = await add.elementHandle();
  expect(await original!.evaluate((el) => el.closest(".page"))).toBeNull();
  const bounds = await add.boundingBox();
  await original!.evaluate((el) => {
    const initial = el.getBoundingClientRect();
    const errors: string[] = [];
    let frames = 0,
      request = 0;
    const check = () => {
      frames++;
      const rect = el.getBoundingClientRect(),
        style = getComputedStyle(el);
      if (!el.isConnected) errors.push("El botón se desmontó");
      if (Math.abs(rect.x - initial.x) > 1 || Math.abs(rect.y - initial.y) > 1)
        errors.push("El botón se desplazó");
      if (
        style.display === "none" ||
        style.visibility !== "visible" ||
        Number(style.opacity) < 1
      )
        errors.push("El botón se ocultó");
      const center = document.elementFromPoint(
        rect.x + rect.width / 2,
        rect.y + rect.height / 2,
      );
      if (center !== el && !el.contains(center))
        errors.push("El botón dejó de estar en primer plano");
      request = requestAnimationFrame(check);
    };
    request = requestAnimationFrame(check);
    (
      window as Window & {
        stopAddCheck?: () => { frames: number; errors: string[] };
      }
    ).stopAddCheck = () => {
      cancelAnimationFrame(request);
      return { frames, errors };
    };
  });
  const content = page.locator(".page");
  await touch(content, "touchstart", 280);
  await touch(content, "touchmove", 150);
  await expect(page.locator(".page-preview-content h1")).toHaveText(
    "Movimientos",
  );
  await expect(add).toHaveAccessibleName("Nuevo movimiento");
  expect(await add.boundingBox()).toEqual(bounds);
  await touch(content, "touchend", 150);
  await expect(content.locator("h1")).toHaveText("Movimientos");
  await touch(content, "touchstart", 280);
  await touch(content, "touchmove", 220);
  await touch(content, "touchmove", 275);
  await touch(content, "touchend", 275);
  await expect(page.locator(".page-preview-content h1")).toHaveCount(0);
  await expect(content.locator("h1")).toHaveText("Movimientos");
  await touch(content, "touchstart", 280);
  await touch(content, "touchmove", 140);
  await touch(content, "touchend", 140);
  await expect(content.locator("h1")).toHaveText("Deudas");
  await expect(add).toHaveAccessibleName("Nueva deuda");
  const nav = page.getByRole("navigation", { name: "Navegación principal" });
  await nav.getByRole("button", { name: "Apartados", exact: true }).click();
  await expect(content.locator("h1")).toHaveText("Apartados");
  await expect(add).toHaveAccessibleName("Nuevo apartado");
  const result = await page.evaluate(() =>
    (
      window as Window & {
        stopAddCheck?: () => { frames: number; errors: string[] };
      }
    ).stopAddCheck!(),
  );
  expect(result.frames).toBeGreaterThan(1);
  expect(result.errors).toEqual([]);
  expect(
    await original!.evaluate(
      (el) => el === document.querySelector(".section-add"),
    ),
  ).toBe(true);
  expect(await add.boundingBox()).toEqual(bounds);
  await add.click();
  await expect(page.getByLabel("Nombre del apartado")).toBeVisible();
});

test("invertir o cancelar el arrastre no adelanta el selector; confirmar lo cambia al soltar", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("./");
  const nav = page.getByRole("navigation", { name: "Navegación principal" });
  await nav.getByRole("button", { name: "Deudas", exact: true }).click();
  const content = page.locator(".page"),
    preview = page.locator(".page-preview-content");
  await expect(content.locator("h1")).toHaveText("Deudas");
  await touch(content, "touchstart", 200);
  for (const [x, title] of [
    [90, "Apartados"],
    [245, "Movimientos"],
    [150, "Apartados"],
    [230, "Movimientos"],
  ] as const) {
    await touch(content, "touchmove", x);
    await expect(preview.locator("h1")).toHaveText(title);
    await expect(
      nav.getByRole("button", { name: "Deudas", exact: true }),
    ).toHaveAttribute("aria-current", "page");
    await expect(
      page.locator(".sidebar button").filter({ hasText: "Deudas" }),
    ).toHaveAttribute("aria-current", "page");
    await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
  }
  await touch(content, "touchend", 202);
  await expect(preview.locator("h1")).toHaveCount(0);
  await expect(content.locator("h1")).toHaveText("Deudas");
  await expect(
    nav.getByRole("button", { name: "Deudas", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await touch(content, "touchstart", 280);
  await touch(content, "touchmove", 120);
  await expect(
    nav.getByRole("button", { name: "Deudas", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await page.evaluate(() => {
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (frames, options) {
      const a = animate.call(this, frames, options);
      a.pause();
      a.currentTime = 50;
      return a;
    };
  });
  await touch(content, "touchend", 120);
  await expect(content.locator("h1")).toHaveText("Deudas");
  await expect(
    nav.getByRole("button", { name: "Apartados", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await page.evaluate(() => document.getAnimations().forEach((a) => a.play()));
  await expect(content.locator("h1")).toHaveText("Apartados");
});
