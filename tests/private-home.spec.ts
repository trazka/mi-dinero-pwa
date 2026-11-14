import { test, expect } from "@playwright/test";
import { setBackupFile } from "./backup-utils";
import { revealHomeSummary } from "./home-utils";

test("Inicio no expone cifras ni movimientos y vuelve a ocultarse al regresar", async ({
  page,
}) => {
  await page.goto("./");
  const nav = page.getByRole("navigation", { name: "Navegación principal" });
  await nav.getByRole("button", { name: "Respaldos", exact: true }).click();
  page.once("dialog", (d) => d.accept());
  await setBackupFile(page, {
    name: "inicio.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        version: 2,
        debts: [],
        movements: [
          {
            id: "income",
            type: "income",
            date: "2026-11-13",
            amount: 1000,
            merchant: "Concepto confidencial",
            category: "Sueldo",
            method: "Efectivo",
            notes: "",
          },
        ],
        savings: [
          {
            id: "goal",
            name: "Meta privada",
            target: 500,
            entries: [
              { id: "entry", type: "deposit", amount: 300, date: "2026-11-13" },
            ],
          },
        ],
      }),
    ),
  });
  await expect(page.getByRole("status")).toContainText("Datos guardados");
  await nav.getByRole("button", { name: "Inicio", exact: true }).click();
  const hidden = async () => {
    await expect(page.locator(".page h1")).toHaveText("Tu espacio");
    await expect(
      page.locator(".overview,.dashboard-grid,.balance-number,.movement-list"),
    ).toHaveCount(0);
    await expect(
      page.getByText("Concepto confidencial", { exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Ver mi resumen", exact: true }),
    ).toBeVisible();
  };
  await hidden();
  await expect(page.locator(".app-identity img:visible")).toHaveAttribute(
    "src",
    "/mi-dinero-pwa/icon-v2.svg",
  );
  await revealHomeSummary(page);
  await expect(page.locator(".balance-number")).toContainText("$700.00");
  await expect(
    page.getByText("Concepto confidencial", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Ocultar resumen", exact: true }),
  ).toHaveCount(0);
  await nav.getByRole("button", { name: "Inicio", exact: true }).click();
  await hidden();
  await revealHomeSummary(page);
  await nav.getByRole("button", { name: "Movimientos", exact: true }).click();
  await nav.getByRole("button", { name: "Inicio", exact: true }).click();
  await hidden();
  await revealHomeSummary(page);
  await nav.getByRole("button", { name: "Inicio", exact: true }).click();
  await hidden();
  await revealHomeSummary(page);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await hidden();
  await page.reload();
  await hidden();
});

test("accesos de Inicio abren captura, abonos, movimientos y apartados ocultos", async ({
  page,
}) => {
  await page.goto("./");
  const nav = page.getByRole("navigation", { name: "Navegación principal" });
  const add = page.getByRole("button", {
    name: "Nuevo movimiento",
    exact: true,
  });
  await expect(add).toHaveClass(/section-add/);
  await expect(add).toHaveCSS("border-radius", "50%");
  await add.click();
  await expect(page.getByLabel("Tipo", { exact: true })).toHaveValue("expense");
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page
    .getByRole("button", { name: "Registrar un abono", exact: true })
    .click();
  await expect(page.getByLabel("Tipo", { exact: true })).toHaveValue("payment");
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page
    .getByRole("button", { name: "Consultar movimientos", exact: true })
    .click();
  await expect(
    page.getByRole("tab", { name: "Todos", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await nav.getByRole("button", { name: "Inicio", exact: true }).click();
  await page
    .getByRole("button", { name: "Mis apartados", exact: true })
    .click();
  await expect(page.locator(".page h1")).toHaveText("Apartados");
  await expect(
    page.getByRole("button", { name: "Mostrar ahorros", exact: true }),
  ).toBeVisible();
});
