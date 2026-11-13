import { test, expect } from "@playwright/test";
import { setBackupFile } from "./backup-utils";

test("elegir concepto carga la última categoría, admite cambiarla y sirve en recurrentes", async ({
  page,
}) => {
  await page.goto("./");
  const nav = page.getByRole("navigation", { name: "Navegación principal" });
  await nav.getByRole("button", { name: "Respaldos", exact: true }).click();
  const base = {
    type: "expense",
    merchant: "Café Luna",
    amount: 10,
    method: "Efectivo",
    notes: "",
  };
  page.once("dialog", (d) => d.accept());
  await setBackupFile(page, {
    name: "categorias.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        version: 2,
        debts: [],
        movements: [
          { ...base, id: "old", date: "2026-11-12", category: "Salud" },
          { ...base, id: "last", date: "2026-11-01", category: "Restaurantes" },
        ],
        recurrents: [
          {
            id: "rule",
            merchant: "Seguro anual",
            category: "Seguros",
            amount: 50,
            method: "Efectivo",
            nextDate: "2027-01-01",
            frequency: "yearly",
            active: true,
            anchorDay: 1,
          },
        ],
      }),
    ),
  });
  await expect(page.getByRole("status")).toContainText("Datos guardados");
  await nav.getByRole("button", { name: "Inicio", exact: true }).click();
  await page
    .getByRole("button", { name: "Nuevo movimiento", exact: true })
    .click();
  const concept = page.getByLabel("Establecimiento o concepto", {
    exact: true,
  });
  const category = page
    .getByRole("dialog")
    .getByLabel("Categoría", { exact: true });
  await concept.fill("seguro");
  await page.getByRole("option", { name: "Seguro anual", exact: true }).tap();
  await expect(category).toHaveValue("Seguros");
  await concept.fill("cafe");
  await page.getByRole("option", { name: "Café Luna", exact: true }).tap();
  await expect(category).toHaveValue("Restaurantes");
  await expect(concept).toHaveAttribute("aria-expanded", "false");
  await expect(
    page.getByRole("listbox", { name: "Conceptos registrados" }),
  ).toHaveCount(0);
  await category.focus();
  await category.selectOption("Hogar");
  await expect(category).not.toBeFocused();
  await page.getByLabel("Importe (MXN)", { exact: true }).fill("25");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  await nav.getByRole("button", { name: "Movimientos", exact: true }).click();
  await page
    .getByRole("button", { name: "Editar Café Luna", exact: true })
    .first()
    .click();
  await expect(category).toHaveValue("Hogar");
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page
    .getByRole("button", { name: "Crear recurrente", exact: true })
    .click();
  await page.getByLabel("Concepto recurrente", { exact: true }).fill("cafe");
  await page.getByRole("option", { name: "Café Luna", exact: true }).tap();
  await expect(
    page.getByLabel("Categoría recurrente", { exact: true }),
  ).toHaveValue("Hogar");
  await page
    .getByLabel("Categoría recurrente", { exact: true })
    .selectOption("Transporte");
  await page
    .getByLabel("Concepto recurrente", { exact: true })
    .fill("Concepto nuevo");
  await expect(
    page.getByLabel("Categoría recurrente", { exact: true }),
  ).toHaveValue("Transporte");
});
