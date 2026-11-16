import { test, expect } from "@playwright/test";
import { setBackupFile } from "./backup-utils";

test("deudas empiezan contraídas, se despliegan con teclado y se ocultan al regresar", async ({
  page,
}) => {
  await page.goto("./");
  const nav = page.getByRole("navigation", { name: "Navegación principal" });
  await nav.getByRole("button", { name: "Respaldos", exact: true }).click();
  page.once("dialog", (d) => d.accept());
  await setBackupFile(page, {
    name: "deudas.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        version: 2,
        movements: [],
        debts: [
          {
            id: "one",
            creditor: "Tarjeta de prueba",
            kind: "credit",
            original: 1000,
            initialBalance: 800,
            due: "2026-12-10",
            payments: [],
            charges: [],
          },
          {
            id: "two",
            creditor: "Auto de prueba",
            original: 2000,
            initialBalance: 1500,
            due: "2027-01-10",
            payments: [],
          },
        ],
      }),
    ),
  });
  await expect(page.getByRole("status")).toContainText("Datos guardados");
  await nav.getByRole("button", { name: "Deudas", exact: true }).click();
  const cards = page.locator(".page .debt-detail");
  await expect(cards).toHaveCount(2);
  await expect(page.locator(".page-preview-content h1")).toHaveCount(0);
  await expect(cards.first()).not.toHaveAttribute("open");
  await expect(cards.first().locator(".debt-number")).toBeHidden();
  await expect(cards.last().locator(".debt-number")).toBeHidden();
  const toggle = cards.first().locator(":scope > summary");
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(cards.first().locator(".debt-number")).toBeVisible();
  await expect(
    cards.first().getByRole("button", { name: "Registrar abono" }),
  ).toBeVisible();
  await expect(cards.last().locator(".debt-number")).toBeHidden();
  await cards.last().locator(":scope > summary").click();
  await expect(cards.first().locator(".debt-number")).toBeHidden();
  await expect(cards.last().locator(".debt-number")).toBeVisible();
  await toggle.click();
  await expect(cards.last().locator(".debt-number")).toBeHidden();
  await expect(cards.first().locator(".debt-number")).toBeVisible();
  await toggle.click();
  await expect(cards.first().locator(".debt-number")).toBeHidden();
  await toggle.click();
  await nav.getByRole("button", { name: "Inicio", exact: true }).click();
  await expect(page.locator(".page h1")).toHaveText("Tu espacio");
  await nav.getByRole("button", { name: "Deudas", exact: true }).click();
  await expect(page.locator(".page-preview-content h1")).toHaveCount(0);
  await expect(cards.first()).not.toHaveAttribute("open");
  await expect(cards.first().locator(".debt-number")).toBeHidden();
});
