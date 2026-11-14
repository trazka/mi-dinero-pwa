import { revealHomeSummary } from "./home-utils";
import { test, expect } from "@playwright/test";

test("importes en pesos conservan centavos, validación y persistencia", async ({
  page,
}) => {
  await page.goto("./");
  const nav = page.getByRole("navigation", { name: "Navegación principal" });
  await expect(
    page.getByRole("button", { name: "Nuevo movimiento", exact: true }),
  ).toBeEnabled();
  await nav.getByRole("button", { name: "Deudas", exact: true }).click();
  await page.getByRole("button", { name: "Nueva deuda", exact: true }).click();
  await page.getByLabel("Tipo de deuda").selectOption("credit");
  await page.getByLabel("Acreedor", { exact: true }).fill("Tarjeta de prueba");
  const original = page.getByLabel("Importe original (MXN)");
  const balance = page.getByLabel("Saldo pendiente actual (MXN)");
  await original.fill("153900");
  await balance.fill("$118,097.70");
  await balance.blur();
  await expect(original).toHaveValue("$153,900.00");
  await expect(balance).toHaveValue("$118,097.70");
  await balance.focus();
  await expect(balance).toHaveValue("$118,097.70");
  await balance.fill("118097.701");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(
    await balance.evaluate((el: HTMLInputElement) => el.validity.valid),
  ).toBe(false);
  await balance.fill("118097.70");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.locator(".debt-number")).toHaveText("$118,097.70");
  await page.reload();
  await nav.getByRole("button", { name: "Deudas", exact: true }).click();
  await expect(page.locator(".debt-number")).toHaveText("$118,097.70");
  await page
    .getByRole("button", { name: "Registrar abono", exact: true })
    .click();
  const payment = page.getByLabel("Importe del abono (MXN)");
  await payment.fill("118098");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(
    await payment.evaluate((el: HTMLInputElement) => el.validity.valid),
  ).toBe(false);
  await payment.fill("$1,000.25");
  await payment.blur();
  await expect(payment).toHaveValue("$1,000.25");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.locator(".debt-number")).toHaveText("$117,097.45");
  await nav.getByRole("button", { name: "Inicio", exact: true }).click();
  await revealHomeSummary(page);
  await expect(page.locator(".balance-number")).toContainText("-$1,000.25");
});
