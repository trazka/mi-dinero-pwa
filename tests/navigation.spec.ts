import { test, expect } from "@playwright/test";

test("sugerencias permiten conceptos nuevos y conservan los registros", async ({
  page,
}) => {
  await page.goto("./");
  for (const concept of [
    "Tienda de prueba",
    "Concepto completamente nuevo",
    "Café Central",
  ]) {
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
  const concept = page.getByRole("combobox", {
    name: "Establecimiento o concepto",
    exact: true,
  });
  await concept.focus();
  await expect(
    page.getByRole("option", { name: "Tienda de prueba", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("option", {
      name: "Concepto completamente nuevo",
      exact: true,
    }),
  ).toBeVisible();
  await concept.fill("tiENda");
  await expect(
    page.getByRole("option", { name: "Tienda de prueba", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("option", {
      name: "Concepto completamente nuevo",
      exact: true,
    }),
  ).toHaveCount(0);
  await page
    .getByRole("option", { name: "Tienda de prueba", exact: true })
    .click();
  await expect(concept).toHaveValue("Tienda de prueba");
  await concept.fill("ti");
  const option = page.getByRole("option", {
    name: "Tienda de prueba",
    exact: true,
  });
  // Safari can omit click after pointerdown.preventDefault(). A touch release
  // must select without relying on a compatibility mouse event.
  await option.dispatchEvent("pointerdown", {
    pointerId: 1,
    pointerType: "touch",
    clientX: 40,
    clientY: 50,
  });
  await option.dispatchEvent("pointerup", {
    pointerId: 1,
    pointerType: "touch",
    clientX: 40,
    clientY: 50,
  });
  await expect(concept).toHaveValue("Tienda de prueba");
  await concept.fill("ti");
  await option.dispatchEvent("pointerdown", {
    pointerId: 2,
    pointerType: "touch",
    clientX: 40,
    clientY: 50,
  });
  await option.dispatchEvent("pointercancel", {
    pointerId: 2,
    pointerType: "touch",
  });
  await option.dispatchEvent("pointerup", {
    pointerId: 2,
    pointerType: "touch",
    clientX: 40,
    clientY: 50,
  });
  await expect(concept).toHaveValue("ti");
  await option.tap();
  await expect(concept).toHaveValue("Tienda de prueba");
  await concept.fill("ti");
  await option.dispatchEvent("pointerdown", {
    pointerId: 3,
    pointerType: "touch",
    screenX: 80,
    screenY: 450,
    clientX: 80,
    clientY: 450,
  });
  await concept.blur();
  await expect(option).toBeVisible();
  // Closing the keyboard moves the option in the viewport during the tap.
  await option.dispatchEvent("pointerup", {
    pointerId: 3,
    pointerType: "touch",
    screenX: 80,
    screenY: 450,
    clientX: 80,
    clientY: 650,
  });
  await expect(concept).toHaveValue("Tienda de prueba");
  await concept.focus();
  await concept.fill("cafe");
  await expect(
    page.getByRole("option", { name: "Café Central", exact: true }),
  ).toBeVisible();
  await concept.press("ArrowDown");
  await concept.press("Enter");
  await expect(concept).toHaveValue("Café Central");
  await concept.fill("Otro concepto nuevo");
  await page.getByLabel("Importe (MXN)", { exact: true }).fill("25");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("navigation", { name: "Navegación principal" })
    .getByRole("button", { name: "Movimientos", exact: true })
    .click();
  const filter = page.getByLabel("Establecimiento", { exact: true });
  await filter.fill("tienda");
  await page
    .getByRole("option", { name: "Tienda de prueba", exact: true })
    .click();
  await expect(filter).toHaveValue("Tienda de prueba");
  await expect(page.locator(".movement")).toHaveCount(1);
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
  await expect(page.locator(".section-add")).toHaveAccessibleName(
    "Nuevo apartado",
  );
  await expect(page.locator(".section-add")).toHaveText("");
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

test("deslizamientos táctiles reales recorren todas las secciones en ambos sentidos", async ({
  page,
  context,
}) => {
  await page.goto("./");
  await expect(page.locator(".page h1")).toHaveText("Tu resumen");
  const cdp = await context.newCDPSession(page);
  async function swipe(direction: "left" | "right") {
    const x = direction === "left" ? 300 : 90;
    const dx = direction === "left" ? -180 : 180;
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y: 120 }],
    });
    for (let step = 1; step <= 6; step++) {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: x + (dx * step) / 6, y: 120 + (35 * step) / 6 }],
      });
    }
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
  }
  await swipe("right");
  await expect(page.locator(".page h1")).toHaveText("Tu resumen");
  for (const name of [
    "Movimientos",
    "Deudas",
    "Apartados",
    "Reportes",
    "Respaldos",
  ]) {
    await swipe("left");
    await expect(page.locator(".page h1")).toHaveText(name);
  }
  await swipe("left");
  await expect(page.locator(".page h1")).toHaveText("Respaldos");
  for (const name of [
    "Reportes",
    "Apartados",
    "Deudas",
    "Movimientos",
    "Tu resumen",
  ]) {
    await swipe("right");
    await expect(page.locator(".page h1")).toHaveText(name);
  }
});
