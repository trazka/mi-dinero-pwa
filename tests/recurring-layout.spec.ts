import { test, expect } from "@playwright/test";
import { setBackupFile } from "./backup-utils";

test("recurrentes compactos, alta arriba y edición debajo del elemento elegido", async ({
  page,
}) => {
  await page.goto("./");
  const nav = page.getByRole("navigation", { name: "Navegación principal" });
  await nav.getByRole("button", { name: "Respaldos", exact: true }).click();
  page.once("dialog", (d) => d.accept());
  await setBackupFile(page, {
    name: "recurrents.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        version: 2,
        movements: [],
        debts: [],
        recurrents: ["Internet", "Gasolina"].map((merchant, i) => ({
          id: `r${i}`,
          merchant,
          amount: 500 + i,
          category: "Hogar",
          method: "Efectivo",
          nextDate: "2099-11-19",
          frequency: "monthly",
          active: true,
          anchorDay: 19,
        })),
      }),
    ),
  });
  await expect(page.getByRole("status")).toContainText("Datos guardados");
  await nav.getByRole("button", { name: "Movimientos", exact: true }).click();
  const items = page.locator(".page .recurring-item");
  await expect(items).toHaveCount(2);
  expect(
    await items.nth(0).evaluate((node) => node.getBoundingClientRect().height),
  ).toBeLessThanOrEqual(60);
  await expect(items.locator("details[open]")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Registrar Internet", exact: true }),
  ).toBeHidden();
  await items.nth(0).locator("summary").click();
  await expect(
    items.nth(0).getByText("$500.00", { exact: false }),
  ).toBeVisible();
  await expect(items.nth(0).locator("time")).toHaveText("19-nov-2099");
  await expect(
    items
      .nth(0)
      .getByRole("button", { name: "Registrar Internet", exact: true }),
  ).toHaveCount(0);
  await expect(
    items
      .nth(0)
      .getByRole("button", { name: "Editar recurrente Internet", exact: true }),
  ).toHaveText("Editar");
  await items.nth(1).locator("summary").click();
  await expect(items.nth(0).locator("details")).not.toHaveAttribute("open");
  await expect(items.locator("details[open]")).toHaveCount(1);
  await items.nth(0).locator("summary").click();
  await expect(items.nth(1).locator("details")).not.toHaveAttribute("open");

  await items.nth(0).locator("summary").click();
  await expect(
    items.nth(0).getByText("$500.00", { exact: false }),
  ).toBeHidden();
  await page
    .getByRole("button", { name: "Crear recurrente", exact: true })
    .click();
  const form = page
    .locator(".page form")
    .filter({ has: page.getByLabel("Concepto recurrente") });
  await expect(form).toBeVisible();
  expect(
    await form.evaluate(
      (node) =>
        !!(
          node.compareDocumentPosition(
            node.parentElement!.querySelector(".recurring-item")!,
          ) & Node.DOCUMENT_POSITION_FOLLOWING
        ),
    ),
  ).toBe(true);
  await page.getByLabel("Concepto recurrente").fill("Seguro");
  await page.getByLabel("Importe recurrente (MXN)").fill("250");
  await page
    .getByRole("button", { name: "Guardar recurrente", exact: true })
    .click();
  await expect(items).toHaveCount(3);
  await expect(items.nth(2).locator("details[open]")).toHaveCount(0);
  await items.nth(0).locator("summary").click();
  await page
    .getByRole("button", { name: "Editar recurrente Internet", exact: true })
    .click();
  await expect(items.nth(0).getByLabel("Concepto recurrente")).toHaveValue(
    "Internet",
  );
  await expect(items.nth(1).locator("form")).toHaveCount(0);
  expect(
    await items
      .nth(0)
      .locator("details")
      .evaluate((node) => node.lastElementChild?.tagName),
  ).toBe("FORM");
  await page.getByLabel("Importe recurrente (MXN)").fill("550");
  await items.nth(1).locator("summary").click();
  await expect(page.getByLabel("Concepto recurrente")).toHaveCount(0);
  await expect(page.locator(".section-add")).toBeEnabled();
  await items.nth(0).locator("summary").click();
  await page
    .getByRole("button", { name: "Editar recurrente Internet", exact: true })
    .click();
  await expect(page.getByLabel("Importe recurrente (MXN)")).toHaveValue(
    "$500.00",
  );
  await page.getByLabel("Importe recurrente (MXN)").fill("550");

  await page
    .getByRole("button", { name: "Guardar recurrente", exact: true })
    .click();
  await expect(
    items
      .filter({ has: page.locator("summary", { hasText: "Internet" }) })
      .getByText("$550.00", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Editar recurrente Internet", exact: true })
    .click();
  await page.getByLabel("Concepto recurrente").fill("No guardar");
  await expect(page.locator(".section-add")).toBeDisabled();
  const internet = items.filter({
    has: page.locator("summary", { hasText: "Internet" }),
  });
  await internet.locator("summary").click();
  await expect(page.getByLabel("Concepto recurrente")).toHaveCount(0);
  await expect(page.locator(".section-add")).toBeEnabled();
  await page.locator(".page").dispatchEvent("touchstart", {
    touches: [{ identifier: 1, clientX: 280, clientY: 240 }],
  });
  await page.locator(".page").dispatchEvent("touchend", {
    changedTouches: [{ identifier: 1, clientX: 120, clientY: 240 }],
  });
  await expect(page.locator(".page h1")).toHaveText("Deudas");
  await nav.getByRole("button", { name: "Movimientos", exact: true }).click();
  await expect(page.locator(".page h1")).toHaveText("Movimientos");
  await internet.locator("summary").click();
  await page
    .getByRole("button", { name: "Editar recurrente Internet", exact: true })
    .click();
  await expect(page.getByLabel("Concepto recurrente")).toHaveValue("Internet");
  await expect(page.getByLabel("Importe recurrente (MXN)")).toHaveValue(
    "$550.00",
  );
  await page
    .getByRole("button", { name: "Cancelar recurrente", exact: true })
    .click();
  await page.locator(".section-add").click();
  await expect(
    page.getByRole("dialog", { name: "Nuevo movimiento", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(
    items
      .filter({ has: page.locator("summary", { hasText: "Internet" }) })
      .locator("summary"),
  ).toHaveText("Internet");
  await page.reload();
  await nav.getByRole("button", { name: "Movimientos", exact: true }).click();
  await expect(items).toHaveCount(3);
  await expect(items.locator("details[open]")).toHaveCount(0);
  await items
    .filter({ has: page.locator("summary", { hasText: "Internet" }) })
    .locator("summary")
    .click();
  await expect(
    items
      .filter({ has: page.locator("summary", { hasText: "Internet" }) })
      .getByText("$550.00", { exact: false }),
  ).toBeVisible();
});

test("acciones cortas y Registrar solo para recurrentes activos vencidos", async ({
  page,
}) => {
  await page.goto("./");
  const nav = page.getByRole("navigation", { name: "Navegación principal" });
  await nav.getByRole("button", { name: "Respaldos", exact: true }).click();
  page.once("dialog", (d) => d.accept());
  await setBackupFile(page, {
    name: "states.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        version: 2,
        movements: [],
        debts: [],
        recurrents: [
          {
            id: "due",
            merchant: "Vencido",
            active: true,
            nextDate: "2020-12-06",
          },
          {
            id: "future",
            merchant: "Futuro",
            active: true,
            nextDate: "2099-12-06",
          },
          {
            id: "paused",
            merchant: "Pausado",
            active: false,
            nextDate: "2020-12-06",
          },
        ].map((r) => ({
          ...r,
          amount: 800,
          category: "Hogar",
          method: "Efectivo",
          frequency: "monthly",
          anchorDay: 6,
        })),
      }),
    ),
  });
  await expect(page.getByRole("status")).toContainText("Datos guardados");
  await nav.getByRole("button", { name: "Movimientos", exact: true }).click();
  const items = page.locator(".page .recurring-item");
  const due = items.filter({
    has: page.locator("summary", { hasText: "Vencido" }),
  });
  await due.locator("summary").click();
  await expect(due.locator("time")).toHaveCount(1);
  await expect(due.locator("time")).toHaveText("06-dic-2020");
  await expect(due.locator(".recurring-meta")).toContainText(
    "Pendiente: 06-dic-2020",
  );
  expect(
    await due
      .locator(".recurring-meta")
      .evaluate((el) => el.getBoundingClientRect().height),
  ).toBeLessThanOrEqual(42);
  await expect(due.locator(".recurring-actions > button")).toHaveText([
    "Registrar",
    "Editar",
    "Pausar",
    "Eliminar",
  ]);
  expect(
    await due
      .locator(".recurring-actions")
      .evaluate((n) => n.getBoundingClientRect().height),
  ).toBeLessThanOrEqual(60);
  await due
    .getByRole("button", { name: "Pausar Vencido", exact: true })
    .click();
  await expect(
    due.getByRole("button", { name: "Registrar Vencido", exact: true }),
  ).toHaveCount(0);
  await due
    .getByRole("button", { name: "Reactivar Vencido", exact: true })
    .click();
  await expect(
    due.getByRole("button", { name: "Registrar Vencido", exact: true }),
  ).toBeEnabled();
  for (const name of ["Futuro", "Pausado"]) {
    const item = items.filter({
      has: page.locator("summary", { hasText: name }),
    });
    await item.locator("summary").click();
    await expect(items.locator("details[open]")).toHaveCount(1);
    await expect(item.locator(".recurring-meta")).toContainText(
      name === "Futuro"
        ? "Próximo pago: 06-dic-2099"
        : "Pausado · Fecha: 06-dic-2020",
    );
    await expect(item.locator("time")).toHaveCount(1);
    await expect(
      item.getByRole("button", { name: `Registrar ${name}`, exact: true }),
    ).toHaveCount(0);
  }
});
