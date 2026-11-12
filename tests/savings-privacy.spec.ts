import { test, expect } from "@playwright/test";
import { setBackupFile } from "./backup-utils";
import { enableSavingsPrivacy } from "./savings-privacy-utils";
const fixture = {
  version: 2,
  movements: [
    {
      id: "income",
      type: "income",
      date: "2026-11-12",
      merchant: "Ingreso",
      category: "Sueldo",
      amount: 1000,
      method: "Efectivo",
      notes: "",
    },
  ],
  debts: [],
  savings: [
    {
      id: "saving",
      name: "Meta confidencial",
      target: 900,
      entries: [
        { id: "deposit", type: "deposit", amount: 350, date: "2026-11-12" },
      ],
    },
  ],
};
async function seed(page: import("@playwright/test").Page) {
  await page.goto("./");
  const nav = page.getByRole("navigation", { name: "Navegación principal" });
  await nav.getByRole("button", { name: "Respaldos", exact: true }).click();
  page.once("dialog", (d) => d.accept());
  await setBackupFile(page, {
    name: "private.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(fixture)),
  });
  await expect(page.getByRole("status")).toContainText("Datos guardados");
  await nav.getByRole("button", { name: "Inicio", exact: true }).click();
}
test("sin bloqueo no revela ahorros y conserva los importes en el respaldo", async ({
  page,
}) => {
  await seed(page);
  const nav = page.getByRole("navigation", { name: "Navegación principal" });
  await expect(page.locator(".savings-summary")).toContainText("••••");
  await expect(page.locator(".savings-summary")).not.toContainText("$350.00");
  await expect(
    page.getByRole("button", { name: "Mostrar ahorros", exact: true }),
  ).toBeDisabled();
  await nav.getByRole("button", { name: "Apartados", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Meta confidencial", exact: true }),
  ).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Nuevo apartado", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Configurar bloqueo", exact: true })
    .click();
  await expect(page.locator(".page h1")).toHaveText("Respaldos");
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Exportar respaldo JSON", exact: true })
    .click();
  const path = await (await download).path();
  const { readFile } = await import("node:fs/promises");
  const backup = JSON.parse(await readFile(path!, "utf8"));
  expect(backup.savings).toEqual(fixture.savings);
  expect(backup.movements).toEqual(fixture.movements);
});
test("el ojo exige verificación manual y vuelve a ocultar al salir", async ({
  page,
  context,
}) => {
  await seed(page);
  await enableSavingsPrivacy(page, context);
  const nav = page.getByRole("navigation", { name: "Navegación principal" });
  await expect(page.locator(".savings-summary")).toContainText("$350.00");
  await nav.getByRole("button", { name: "Apartados", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Meta confidencial", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Ocultar ahorros", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Meta confidencial", exact: true }),
  ).toBeHidden();
  await page.evaluate(() => {
    const original = navigator.credentials.get.bind(navigator.credentials);
    (window as any).verificationCalls = 0;
    navigator.credentials.get = async (options) => {
      (window as any).verificationCalls++;
      return original(options);
    };
  });
  await page
    .getByRole("button", { name: "Mostrar ahorros", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Mi dinero está bloqueado",
      exact: true,
    }),
  ).toBeVisible();
  expect(await page.evaluate(() => (window as any).verificationCalls)).toBe(0);
  await page
    .getByRole("button", {
      name: "Desbloquear con el dispositivo",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "Meta confidencial", exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => (window as any).verificationCalls)).toBe(1);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(nav).toBeHidden();
  await page.evaluate(() => {
    Reflect.deleteProperty(document, "hidden");
    document.dispatchEvent(new Event("visibilitychange"));
  });
  expect(await page.evaluate(() => (window as any).verificationCalls)).toBe(1);
  await page
    .getByRole("button", {
      name: "Desbloquear con el dispositivo",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "Meta confidencial", exact: true }),
  ).toBeHidden();
  await expect(
    page.getByRole("heading", { name: "Ahorros ocultos", exact: true }),
  ).toBeVisible();
  await nav.getByRole("button", { name: "Inicio", exact: true }).click();
  await expect(page.locator(".savings-summary")).toContainText("••••");
});
