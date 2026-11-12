import { chooseDate } from "./date-utils";
import { test, expect, type Page } from "@playwright/test";
import type { Data } from "../src/data";

async function storedData(page: Page): Promise<Data | null> {
  return page.evaluate(
    () =>
      new Promise<Data | null>((resolve, reject) => {
        const open = indexedDB.open("mi-dinero");
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction("data", "readonly");
          const get = tx.objectStore("data").get("main");
          tx.oncomplete = () => {
            db.close();
            resolve(get.result ?? null);
          };
          tx.onabort = () => {
            db.close();
            reject(tx.error);
          };
        };
      }),
  );
}

test("flujos de movimientos, deudas, filtros, respaldos y persistencia en iPhone", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Nuevo movimiento" }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Tipo", { exact: true }).selectOption("income");
  await dialog.getByLabel("Importe (MXN)", { exact: true }).fill("5000");
  await dialog
    .getByLabel("Establecimiento o concepto")
    .fill("Ingreso de prueba");
  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.locator(".balance-number")).toContainText("$5,000.00");
  await page.getByRole("button", { name: "Nuevo movimiento" }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Importe (MXN)", { exact: true }).fill("125.50");
  await dialog
    .getByLabel("Establecimiento o concepto")
    .fill("Tienda de prueba");
  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.locator(".balance-number")).toContainText("$4,874.50");
  await page.getByRole("button", { name: "Editar Tienda de prueba" }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Importe (MXN)", { exact: true })
    .fill("100");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.locator(".balance-number")).toContainText("$4,900.00");
  await page
    .getByRole("navigation", { name: "Navegación principal" })
    .getByRole("button", { name: "Deudas", exact: true })
    .click();
  await page.getByRole("button", { name: "Nueva deuda" }).click();
  dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Acreedor", { exact: true })
    .fill("Acreedor de prueba");
  await dialog.getByLabel("Importe original (MXN)").fill("1000");
  await dialog.getByLabel("Saldo pendiente actual (MXN)").fill("800");
  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
  await page.getByRole("button", { name: "Registrar abono" }).click();
  await page.getByLabel("Importe del abono (MXN)").fill("200");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.locator(".debt-number")).toHaveText("$600.00");
  await page.reload();
  await expect(page.locator(".balance-number")).toContainText("$4,700.00");
  await page
    .getByRole("navigation", { name: "Navegación principal" })
    .getByRole("button", { name: "Movimientos", exact: true })
    .click();
  await expect(page.locator(".movement")).toHaveCount(3);
  await page.getByLabel("Establecimiento", { exact: true }).fill("Tienda");
  await expect(page.locator(".movement")).toHaveCount(1);
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Eliminar Tienda de prueba" }).click();
  await expect(page.locator(".movement")).toHaveCount(0);
  await page.getByLabel("Establecimiento", { exact: true }).fill("");
  await expect(page.locator(".movement")).toHaveCount(2);
  await page
    .getByRole("navigation", { name: "Navegación principal" })
    .getByRole("button", { name: "Reportes", exact: true })
    .click();
  await page.getByLabel("Agrupar por").selectOption("daily");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.locator("tbody")).toContainText("$200.00");
  await page
    .getByRole("navigation", { name: "Navegación principal" })
    .getByRole("button", { name: "Respaldos", exact: true })
    .click();
  const promise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar respaldo JSON" }).click();
  const download = await promise;
  const path = await download.path();
  expect(path).toBeTruthy();
  page.once("dialog", (d) => d.accept());
  await page.locator("input[type=file]").setInputFiles(path!);
  await expect(page.getByRole("status")).toContainText("Datos guardados");
  await page.locator("input[type=file]").setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":2}'),
  });
  await expect(page.getByRole("alert")).toContainText("respaldo no es válido");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
for (const busyStorage of [false, true]) {
  test(`PWA almacena recursos y funciona completamente sin internet${busyStorage ? " con IndexedDB ocupado" : ""}`, async ({
    page,
    context,
  }) => {
    await page.goto("./");
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await expect
      .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
      .toBe(true);
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.getByRole("button", { name: "Nuevo movimiento" }).click();
    await page.getByLabel("Importe (MXN)", { exact: true }).fill("50");
    await page
      .getByLabel("Establecimiento o concepto")
      .fill("Gasto sin conexión");
    if (busyStorage) {
      // Keep a real transaction ahead of the save. No application code is mocked:
      // the write must wait for this transaction to finish before it can commit.
      await page.evaluate(
        () =>
          new Promise<void>((resolve, reject) => {
            const open = indexedDB.open("mi-dinero");
            open.onerror = () => reject(open.error);
            open.onsuccess = () => {
              const db = open.result;
              const tx = db.transaction("data", "readwrite");
              const store = tx.objectStore("data");
              let held = true;
              (
                window as typeof window & {
                  releaseTestTransaction?: () => void;
                }
              ).releaseTestTransaction = () => {
                held = false;
              };
              const pump = () => {
                const get = store.get("main");
                get.onsuccess = () => {
                  if (held) pump();
                };
              };
              tx.oncomplete = () => db.close();
              tx.onabort = () => db.close();
              pump();
              resolve();
            };
          }),
      );
    }
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    if (busyStorage) {
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Guardando…", exact: true }),
      ).toBeDisabled();
      await page.evaluate(() =>
        (window as typeof window & { releaseTestTransaction?: () => void })
          .releaseTestTransaction!(),
      );
    }
    // click() only waits for the event, not for IndexedDB. The app closes the
    // dialog only after changeData has awaited the transaction's completion.
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.locator(".balance-number")).toContainText("-$50.00");
    const beforeReload = await storedData(page);
    expect(beforeReload?.movements).toHaveLength(1);
    expect(beforeReload?.movements[0]).toMatchObject({
      type: "expense",
      amount: 50,
      merchant: "Gasto sin conexión",
    });
    await page.reload();
    await expect(page.locator(".balance-number")).toContainText("-$50.00");
    await expect(
      page.getByText("Gasto sin conexión", { exact: true }),
    ).toBeVisible();
    expect(await storedData(page)).toEqual(beforeReload);
    await page.screenshot({
      path: `test-results/iphone-offline${busyStorage ? "-busy-idb" : ""}.png`,
      fullPage: true,
    });
  });
}

test("reportes diarios, semanales, mensuales y filtros inclusivos", async ({
  page,
}) => {
  const movements = [
    {
      id: "a",
      type: "income",
      date: "2026-10-31",
      merchant: "Concepto ficticio",
      category: "Otros",
      amount: 100,
      method: "Efectivo",
      notes: "",
    },
    {
      id: "b",
      type: "expense",
      date: "2026-11-01",
      merchant: "Tienda ficticia",
      category: "Alimentación",
      amount: 20,
      method: "Efectivo",
      notes: "",
    },
    {
      id: "c",
      type: "expense",
      date: "2026-11-02",
      merchant: "Tienda ficticia",
      category: "Transporte",
      amount: 30,
      method: "Efectivo",
      notes: "",
    },
  ];
  await page.goto("./");
  await page
    .getByRole("navigation", { name: "Navegación principal" })
    .getByRole("button", { name: "Respaldos", exact: true })
    .click();
  page.once("dialog", (d) => d.accept());
  await page.locator("input[type=file]").setInputFiles({
    name: "respaldo.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ version: 1, movements, debts: [] })),
  });
  await page
    .getByRole("navigation", { name: "Navegación principal" })
    .getByRole("button", { name: "Reportes", exact: true })
    .click();
  await expect(page.locator("tbody tr")).toHaveCount(2);
  await page.getByLabel("Agrupar por").selectOption("weekly");
  await expect(page.locator("tbody tr")).toHaveCount(2);
  await expect(page.locator("tbody tr").last()).toContainText("$80.00");
  await page.getByLabel("Agrupar por").selectOption("daily");
  await expect(page.locator("tbody tr")).toHaveCount(3);
  await chooseDate(page, "Desde", "2026-11-01");
  await chooseDate(page, "Hasta", "2026-11-02");
  await expect(page.locator("tbody tr")).toHaveCount(2);
  await page
    .getByLabel("Categoría", { exact: true })
    .selectOption("Alimentación");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.locator("tbody")).toContainText("$20.00");
  await page
    .getByLabel("Establecimiento", { exact: true })
    .fill("sin coincidencia");
  await expect(page.locator("tbody tr")).toHaveCount(0);
});

test("manifest, iconos y service worker respetan la ruta de GitHub Pages", async ({
  page,
  context,
}) => {
  await page.goto("./");
  const manifestURL = await page
    .locator('link[rel="manifest"]')
    .getAttribute("href");
  expect(manifestURL).toBe("/mi-dinero-pwa/manifest.webmanifest");
  const response = await page.request.get(manifestURL!);
  expect(response.ok()).toBe(true);
  const manifest = await response.json();
  expect(manifest.id).toBe("/mi-dinero-pwa/");
  expect(manifest.start_url).toBe("/mi-dinero-pwa/");
  expect(manifest.scope).toBe("/mi-dinero-pwa/");
  for (const icon of manifest.icons) {
    expect(icon.src).toMatch(/^\/mi-dinero-pwa\//);
    const image = await page.request.get(icon.src);
    expect(image.ok()).toBe(true);
    expect(image.headers()["content-type"]).toContain("image/png");
  }
  const registration = await page.evaluate(async () => {
    const sw = await navigator.serviceWorker.ready;
    return {
      scope: new URL(sw.scope).pathname,
      script: new URL(sw.active!.scriptURL).pathname,
    };
  });
  expect(registration).toEqual({
    scope: "/mi-dinero-pwa/",
    script: "/mi-dinero-pwa/sw.js",
  });
  expect(
    await page.locator('link[rel="apple-touch-icon"]').getAttribute("href"),
  ).toBe("/mi-dinero-pwa/apple-touch-icon.png");
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await context.setOffline(true);
  await page.goto("./ruta-de-prueba");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(new URL(page.url()).pathname).toBe("/mi-dinero-pwa/ruta-de-prueba");
});
