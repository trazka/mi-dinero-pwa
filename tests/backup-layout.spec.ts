import { test, expect } from "@playwright/test";
import { openBackupExports } from "./backup-utils";

test("Respaldos prioriza guardar y pliega restauración y documentos", async ({
  page,
}) => {
  await page.goto("./");
  const nav = page.getByRole("navigation", { name: "Navegación principal" });
  await nav.getByRole("button", { name: "Respaldos", exact: true }).click();
  await expect(page.locator(".page-preview-content h1")).toHaveCount(0);
  const tools = page.locator(".page .backup-tools");
  await expect(
    tools.getByRole("heading", { name: "Guardar respaldo", exact: true }),
  ).toBeVisible();
  await expect(
    tools.getByRole("button", { name: "Exportar respaldo JSON", exact: true }),
  ).toBeVisible();
  await expect(tools.locator(".backup-restore")).not.toHaveAttribute("open");
  await expect(tools.locator(".backup-exports")).not.toHaveAttribute("open");
  await expect(
    tools.getByRole("button", { name: "Excel", exact: true }),
  ).toBeHidden();
  await tools.locator(".backup-restore > summary").click();
  await expect(tools.getByText(/Importar reemplaza los datos/)).toBeVisible();
  await expect(tools.locator("input[type=file]")).toBeEnabled();
  await openBackupExports(page);
  await expect(
    tools.getByRole("button", { name: "Excel", exact: true }),
  ).toBeVisible();
  await nav.getByRole("button", { name: "Inicio", exact: true }).click();
  await expect(page.locator(".page h1")).toHaveText("Tu espacio");
  await nav.getByRole("button", { name: "Respaldos", exact: true }).click();
  await expect(page.locator(".page-preview-content h1")).toHaveCount(0);
  await expect(tools.locator(".backup-restore")).not.toHaveAttribute("open");
  await expect(tools.locator(".backup-exports")).not.toHaveAttribute("open");
});
