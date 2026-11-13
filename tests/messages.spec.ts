import { test, expect } from "@playwright/test";
import { setBackupFile } from "./backup-utils";

test("avisos caducan, errores repetidos renuevan su tiempo y no viajan entre secciones", async ({
  page,
}) => {
  await page.goto("./");
  const nav = page.getByRole("navigation", { name: "Navegación principal" });
  await nav.getByRole("button", { name: "Respaldos", exact: true }).click();
  await page.clock.install();
  page.once("dialog", (d) => d.accept());
  await setBackupFile(page, {
    name: "avisos.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        version: 2,
        movements: [],
        debts: [],
        savings: [{ id: "goal", name: "Meta", target: 500, entries: [] }],
      }),
    ),
  });
  const notice = page
    .getByRole("status")
    .filter({ hasText: "Datos guardados" });
  await expect(notice).toBeVisible();
  await page.clock.fastForward(4001);
  await expect(notice).toHaveCount(0);
  await nav.getByRole("button", { name: "Apartados", exact: true }).click();
  await page
    .getByRole("button", { name: "Mostrar ahorros", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Aportar a Meta", exact: true })
    .click();
  await page.getByLabel("Importe del apartado (MXN)").fill("100");
  const save = page.getByRole("button", {
    name: "Guardar apartado",
    exact: true,
  });
  const error = page.getByRole("alert");
  await save.click();
  await expect(error).toContainText("supera el dinero libre");
  await page.clock.fastForward(5000);
  await save.click();
  await expect(error).toBeVisible();
  await page.clock.fastForward(1100);
  await expect(error).toBeVisible();
  await page.clock.fastForward(5001);
  await expect(error).toHaveCount(0);
  await expect(page.getByLabel("Importe del apartado (MXN)")).toHaveValue(
    "$100.00",
  );
  await save.click();
  await expect(error).toBeVisible();
  await page.getByRole("button", { name: "Cerrar error", exact: true }).click();
  await expect(error).toHaveCount(0);
  await save.click();
  await expect(error).toBeVisible();
  await nav.getByRole("button", { name: "Deudas", exact: true }).click();
  await expect(error).toHaveCount(0);
});
