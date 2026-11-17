import { test, expect } from "@playwright/test";
import {
  openBackupExports,
  openSaveBackup,
  openSecurity,
} from "./backup-utils";

test("Respaldos prioriza guardar y pliega restauración y documentos", async ({
  page,
}) => {
  await page.goto("./");
  const nav = page.getByRole("navigation", { name: "Navegación principal" });
  await nav.getByRole("button", { name: "Respaldos", exact: true }).click();
  await expect(page.locator(".page-preview-content h1")).toHaveCount(0);
  const tools = page.locator(".page .backup-tools");
  await expect(tools.locator(".backup-save")).not.toHaveAttribute("open");
  await expect(page.locator(".page .security-panel")).not.toHaveAttribute(
    "open",
  );
  await openSaveBackup(page);
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
  await openSecurity(page);
  await expect(
    page.getByRole("button", { name: "Activar bloqueo del dispositivo" }),
  ).toBeVisible();
  await openBackupExports(page);
  await expect(
    tools.getByRole("button", { name: "Excel", exact: true }),
  ).toBeVisible();
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    const buttons = tools.locator(".backup-exports .button");
    const boxes = await buttons.evaluateAll((nodes) =>
      nodes.map((node) => {
        const { x, y, width, height } = node.getBoundingClientRect();
        return { x, y, width, height };
      }),
    );
    expect(boxes).toHaveLength(3);
    expect(
      Math.max(...boxes.map((b) => b.y)) - Math.min(...boxes.map((b) => b.y)),
    ).toBeLessThan(1);
    expect(boxes[2].x + boxes[2].width).toBeLessThanOrEqual(width);
    expect(boxes.every((b) => b.height >= 44)).toBe(true);
  }
  await nav.getByRole("button", { name: "Inicio", exact: true }).click();
  await expect(page.locator(".page h1")).toHaveText("Tu espacio");
  await nav.getByRole("button", { name: "Respaldos", exact: true }).click();
  await expect(page.locator(".page-preview-content h1")).toHaveCount(0);
  await expect(tools.locator(".backup-save")).not.toHaveAttribute("open");
  await expect(page.locator(".page .security-panel")).not.toHaveAttribute(
    "open",
  );
  await expect(tools.locator(".backup-restore")).not.toHaveAttribute("open");
  await expect(tools.locator(".backup-exports")).not.toHaveAttribute("open");
});
