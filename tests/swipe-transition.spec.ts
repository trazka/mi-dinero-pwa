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
  await page.locator(".page .advanced-filters > summary").click();
  const input = page.getByLabel("Establecimiento", { exact: true });
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

test("la tabla conserva su desplazamiento horizontal y permite salir al llegar al borde", async ({
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
  const table = page.locator(".page .table-scroll");
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
