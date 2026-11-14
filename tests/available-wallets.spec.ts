import { test, expect } from "@playwright/test";
import { setBackupFile } from "./backup-utils";
import { revealHomeSummary } from "./home-utils";
test("los apartados antiguos se excluyen de Banco y retirar restaura su disponible", async ({
  page,
}) => {
  await page.goto("./");
  const nav = page.getByRole("navigation", { name: "Navegación principal" });
  await nav.getByRole("button", { name: "Respaldos", exact: true }).click();
  page.once("dialog", (d) => d.accept());
  await setBackupFile(page, {
    name: "savings.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        version: 2,
        debts: [],
        movements: [
          {
            id: "income",
            type: "income",
            amount: 14017.95,
            date: "2026-11-01",
            merchant: "Nómina",
            category: "Sueldo",
            method: "Transferencia",
            notes: "",
          },
        ],
        savings: [
          {
            id: "goal",
            name: "Molinillo",
            target: 4500,
            entries: [
              {
                id: "deposit",
                type: "deposit",
                amount: 2000,
                date: "2026-11-01",
              },
            ],
          },
        ],
      }),
    ),
  });
  await expect(page.getByRole("status")).toContainText("Datos guardados");
  await nav.getByRole("button", { name: "Movimientos", exact: true }).click();
  await expect(page.locator(".page .wallet-balances")).toContainText(
    "Banco disponible",
  );
  await expect(page.locator(".page .wallet-balances")).toContainText(
    "$12,017.95",
  );
  await nav.getByRole("button", { name: "Apartados", exact: true }).click();
  await page
    .getByRole("button", { name: "Mostrar ahorros", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Retirar de Molinillo", exact: true })
    .click();
  await expect(page.getByLabel("Liberar en")).toHaveValue("bank");
  await page.getByLabel("Importe del apartado (MXN)").fill("500");
  await page
    .getByRole("button", { name: "Guardar apartado", exact: true })
    .click();
  await expect(page.getByLabel("Progreso de Molinillo")).toHaveAttribute(
    "value",
    "1500",
  );
  await nav.getByRole("button", { name: "Movimientos", exact: true }).click();
  await expect(page.locator(".page .wallet-balances")).toContainText(
    "$12,517.95",
  );
  await nav.getByRole("button", { name: "Inicio", exact: true }).click();
  await revealHomeSummary(page);
  await expect(page.locator(".page .balance-number")).toContainText(
    "$12,517.95",
  );
  await page.reload();
  await nav.getByRole("button", { name: "Movimientos", exact: true }).click();
  await expect(page.locator(".page .wallet-balances")).toContainText(
    "$12,517.95",
  );
});
