import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { setBackupFile } from "./backup-utils";
import { revealHomeSummary } from "./home-utils";

test("JSON y modo offline conservan pendientes, cancelar no descuenta y confirmar no duplica", async ({
  page,
  context,
}) => {
  await page.clock.setFixedTime(new Date(2026, 10, 14, 12));
  await page.goto("./");
  const nav = page.getByRole("navigation", { name: "Navegación principal" });
  await nav.getByRole("button", { name: "Respaldos", exact: true }).click();
  const base = {
    date: "2026-11-19",
    merchant: "Pago de prueba",
    category: "Hogar",
    method: "Efectivo",
    notes: "",
  };
  page.once("dialog", (d) => d.accept());
  await setBackupFile(page, {
    name: "pending.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        version: 2,
        debts: [],
        movements: [
          {
            ...base,
            id: "salary",
            type: "income",
            date: "2026-11-14",
            method: "Transferencia",
            amount: 1000,
          },
        ],
        pendingMovements: [
          { ...base, id: "pending-expense", type: "expense", amount: 300 },
          {
            ...base,
            id: "pending-transfer",
            type: "transfer",
            amount: 400,
            merchant: "Retiro futuro",
            method: "Banco → Efectivo",
            transferDirection: "bank-to-cash",
          },
        ],
      }),
    ),
  });
  await expect(page.getByRole("status")).toContainText("Datos guardados");
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Exportar respaldo JSON", exact: true })
    .click();
  const file = (await (await download).path())!;
  const backup = JSON.parse(await readFile(file, "utf8"));
  expect(backup.pendingMovements).toHaveLength(2);
  expect(backup.movements).toHaveLength(1);
  page.once("dialog", (d) => d.accept());
  await setBackupFile(page, file);
  await expect(page.getByRole("status")).toContainText("Datos guardados");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await context.setOffline(true);
  await page.clock.setFixedTime(new Date(2026, 10, 21, 12));
  await page.reload();
  await page.getByRole("button", { name: "Revisar pendientes" }).click();
  const pending = page.getByRole("region", { name: "Movimientos pendientes" });
  await page.setViewportSize({ width: 320, height: 844 });
  await expect(pending).toContainText("Por confirmar");
  expect(
    await pending.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
  ).toBe(true);
  await page.screenshot({ path: test.info().outputPath("pendientes-320.png") });
  page.once("dialog", (d) => d.accept());
  await pending
    .getByRole("button", { name: "Cancelar pendiente Pago de prueba" })
    .click();
  await expect(pending.locator("article")).toHaveCount(1);
  await pending
    .getByRole("button", { name: "Confirmar realizado Retiro futuro" })
    .click();
  await expect(pending).toHaveCount(0);
  await expect(page.locator(".wallet-balances")).toContainText("$600.00");
  await expect(page.locator(".wallet-balances")).toContainText("$400.00");
  await page.reload();
  await nav.getByRole("button", { name: "Movimientos", exact: true }).click();
  await expect(
    page.locator(".movement-info").filter({ hasText: "Retiro futuro" }),
  ).toHaveCount(1);
  await expect(pending).toHaveCount(0);
  await nav.getByRole("button", { name: "Inicio", exact: true }).click();
  await revealHomeSummary(page);
  await expect(page.locator(".balance-number")).toContainText("$1,000.00");
});
