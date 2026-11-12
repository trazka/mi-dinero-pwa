import { test, expect, devices } from "@playwright/test";
test("recargar durante la primera instalación no deja la página sin control offline", async ({
  browser,
}) => {
  for (let i = 0; i < 4; i++) {
    const context = await browser.newContext({
      ...devices["iPhone 13"],
      baseURL: "http://localhost:4173/mi-dinero-pwa/",
      colorScheme: "dark",
    });
    const page = await context.newPage();
    await page.goto("./");
    await page.getByRole("button", { name: "Apariencia", exact: true }).click();
    await page.getByRole("button", { name: "Claro", exact: true }).click();
    await page.reload();
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await expect
      .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
      .toBe(true);
    await context.setOffline(true);
    await page.reload();
    await expect(
      page.getByRole("button", { name: "Nuevo movimiento", exact: true }),
    ).toBeEnabled();
    await expect(
      page.getByRole("heading", { level: 1, name: "Tu resumen", exact: true }),
    ).toBeVisible();
    await context.close();
  }
});
