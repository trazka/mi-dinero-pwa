import { test, expect } from "@playwright/test";
test("la actualización pendiente se puede aplicar y se bloquea mientras hay un formulario abierto", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.__miDineroUpdate = async () => {
      document.documentElement.dataset.updateApplied = "true";
    };
  });
  await page.goto("./");
  const update = page.getByRole("button", {
    name: "Actualizar aplicación",
    exact: true,
  });
  await expect(update).toBeEnabled();
  await page
    .getByRole("button", { name: "Nuevo movimiento", exact: true })
    .click();
  await expect(update).toBeDisabled();
  await page.getByLabel("Cerrar formulario", { exact: true }).click();
  await update.click();
  await expect(page.locator("html")).toHaveAttribute(
    "data-update-applied",
    "true",
  );
});
test("el aviso de actualización no se pierde si llega después del arranque", async ({
  page,
}) => {
  await page.goto("./");
  await expect(
    page.getByRole("button", { name: "Nuevo movimiento", exact: true }),
  ).toBeEnabled();
  await page.evaluate(() => {
    window.__miDineroUpdate = async () => {
      throw Error("Sin conexión de prueba");
    };
    window.dispatchEvent(new Event("update-ready"));
  });
  await page
    .getByRole("button", { name: "Actualizar aplicación", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("No se pudo actualizar");
  await expect(
    page.getByRole("button", { name: "Actualizar aplicación", exact: true }),
  ).toBeEnabled();
});
