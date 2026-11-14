import { test, expect } from "@playwright/test";
import { setBackupFile } from "./backup-utils";
import { revealHomeSummary } from "./home-utils";
import { exportText } from "./export-utils";

test("retiro y depósito conservan el total, se editan y persisten sin duplicar gastos", async ({
  page,
}) => {
  await page.goto("./");
  const nav = page.getByRole("navigation", { name: "Navegación principal" });
  await nav.getByRole("button", { name: "Respaldos", exact: true }).click();
  page.once("dialog", (d) => d.accept());
  await setBackupFile(page, {
    name: "wallets.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        version: 2,
        debts: [],
        movements: [
          {
            id: "salary",
            type: "income",
            date: "2026-11-13",
            merchant: "Nómina",
            category: "Sueldo",
            amount: 7000,
            method: "Transferencia",
            notes: "",
          },
          {
            id: "cash",
            type: "income",
            date: "2026-11-13",
            merchant: "Ingreso efectivo",
            category: "Otros",
            amount: 100,
            method: "Efectivo",
            notes: "",
          },
          {
            id: "expense",
            type: "expense",
            date: "2026-11-13",
            merchant: "Compra débito",
            category: "Compras",
            amount: 200,
            method: "Tarjeta de débito",
            notes: "",
          },
        ],
        savings: [
          {
            id: "goal",
            name: "Meta",
            target: 3000,
            entries: [
              {
                id: "entry",
                type: "deposit",
                date: "2026-11-13",
                amount: 2000,
              },
            ],
          },
        ],
      }),
    ),
  });
  await expect(page.getByRole("status")).toContainText("Datos guardados");
  await nav.getByRole("button", { name: "Movimientos", exact: true }).click();
  const wallets = page.locator(".wallet-balances");
  await expect(wallets).toContainText("$6,800.00");
  async function add(amount: string, direction: string) {
    await page
      .getByRole("button", { name: "Nuevo movimiento", exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Tipo", { exact: true }).selectOption("transfer");
    await dialog.getByLabel("Importe (MXN)", { exact: true }).fill(amount);
    await dialog.getByLabel("Tipo de traspaso").selectOption(direction);
    await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
  }
  await add("1000", "bank-to-cash");
  await expect(wallets).toContainText("$5,800.00");
  await expect(wallets).toContainText("$1,100.00");
  await add("300", "cash-to-bank");
  await expect(wallets).toContainText("$6,100.00");
  await expect(wallets).toContainText("$800.00");
  await page.getByRole("tab", { name: "Traspasos", exact: true }).click();
  await expect(page.locator(".movement-info > strong")).toHaveCount(2);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Excel", exact: true }).click();
  const exported = await exportText(await downloadPromise);
  expect(exported).toContain("Traspaso");
  expect(exported).toContain("Banco");
  expect(exported).toContain("Efectivo");
  await page.reload();
  await nav.getByRole("button", { name: "Movimientos", exact: true }).click();
  await expect(wallets).toContainText("$6,100.00");
  await page
    .getByRole("button", { name: "Editar Retiro a efectivo", exact: true })
    .click();
  await page.getByLabel("Importe (MXN)", { exact: true }).fill("1200");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(wallets).toContainText("$5,900.00");
  await expect(wallets).toContainText("$1,000.00");
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Eliminar Depósito al banco", exact: true })
    .click();
  await expect(wallets).toContainText("$5,600.00");
  await expect(wallets).toContainText("$1,300.00");
  await add("5600.01", "bank-to-cash");
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "saldo de origen",
  );
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await nav.getByRole("button", { name: "Inicio", exact: true }).click();
  await revealHomeSummary(page);
  await expect(page.locator(".balance-number")).toContainText("$4,900.00");
  await nav.getByRole("button", { name: "Movimientos", exact: true }).click();
  await page
    .getByRole("button", { name: "Nuevo movimiento", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Importe (MXN)", { exact: true }).fill("200");
  await dialog
    .getByLabel("Establecimiento o concepto")
    .fill("Compra en efectivo");
  await dialog.getByLabel("Método de pago").selectOption("Efectivo");
  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(wallets).toContainText("$5,600.00");
  await expect(wallets).toContainText("$1,100.00");
  await page.getByRole("tab", { name: "Traspasos", exact: true }).click();
  await nav.getByRole("button", { name: "Reportes", exact: true }).click();
  await expect(
    page.getByLabel("Tipo de movimiento", { exact: true }),
  ).toHaveValue("all");
  await expect(page.locator(".report-totals")).toContainText("$7,100.00");
  await expect(page.locator(".report-totals")).toContainText("$400.00");
  await expect(page.locator("tbody")).not.toContainText("$1,200.00");
});
