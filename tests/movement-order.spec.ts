import { revealHomeSummary } from "./home-utils";
import { test, expect } from "@playwright/test";
import { setBackupFile } from "./backup-utils";

test("movimientos recientes primero, con último registro arriba en la misma fecha", async ({
  page,
}) => {
  await page.goto("./");
  const nav = page.getByRole("navigation", { name: "Navegación principal" });
  await nav.getByRole("button", { name: "Respaldos", exact: true }).click();
  const movements = [
    { id: "first", merchant: "Primero del día", date: "2026-11-12" },
    { id: "second", merchant: "Último del día", date: "2026-11-12" },
    { id: "backdated", merchant: "Fecha anterior", date: "2026-11-11" },
  ].map((m) => ({
    ...m,
    type: "expense",
    category: "Alimentación",
    amount: 10,
    method: "Efectivo",
    notes: "",
  }));
  page.once("dialog", (d) => d.accept());
  await setBackupFile(page, {
    name: "orden.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ version: 2, movements, debts: [] })),
  });
  await expect(page.getByRole("status")).toContainText("Datos guardados");
  const order = ["Último del día", "Primero del día", "Fecha anterior"];
  const names = page.locator(".movement-info > strong");
  await nav.getByRole("button", { name: "Inicio", exact: true }).click();
  await revealHomeSummary(page);
  await expect(names).toHaveText(order);
  await nav.getByRole("button", { name: "Movimientos", exact: true }).click();
  await expect(names).toHaveText(order);
  await page
    .getByRole("button", { name: "Editar Primero del día", exact: true })
    .click();
  await page.getByLabel("Importe (MXN)", { exact: true }).fill("20");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(names).toHaveText(order);
  await page.reload();
  await nav.getByRole("button", { name: "Movimientos", exact: true }).click();
  await expect(names).toHaveText(order);
});
