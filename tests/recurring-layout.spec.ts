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
          nextDate: "2026-11-19",
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
  await expect(items.locator("details[open]")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Registrar Internet", exact: true }),
  ).toBeHidden();
  await items.nth(0).locator("summary").click();
  await expect(
    items.nth(0).getByText("$500.00", { exact: false }),
  ).toBeVisible();
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
    await items.nth(0).evaluate((node) => node.lastElementChild?.tagName),
  ).toBe("FORM");
  await page.getByLabel("Importe recurrente (MXN)").fill("550");
  await page
    .getByRole("button", { name: "Guardar recurrente", exact: true })
    .click();
  await expect(
    items.nth(0).getByText("$550.00", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Editar recurrente Internet", exact: true })
    .click();
  await page.getByLabel("Concepto recurrente").fill("No guardar");
  await page
    .getByRole("button", { name: "Cancelar recurrente", exact: true })
    .click();
  await expect(items.nth(0).locator("summary")).toHaveText("Internet");
  await page.reload();
  await nav.getByRole("button", { name: "Movimientos", exact: true }).click();
  await expect(items).toHaveCount(3);
  await expect(items.locator("details[open]")).toHaveCount(0);
  await items.nth(0).locator("summary").click();
  await expect(
    items.nth(0).getByText("$550.00", { exact: false }),
  ).toBeVisible();
});
