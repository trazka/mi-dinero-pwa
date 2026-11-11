import { test, expect } from "@playwright/test";
const fixture = {
  version: 1,
  movements: [
    {
      id: "preserved-test",
      type: "expense",
      date: "2026-11-11",
      merchant: "Dato ficticio conservado",
      category: "Otros",
      amount: 50,
      method: "Efectivo",
      notes: "",
    },
  ],
  debts: [],
};
for (const failure of ["bundle", "module", "react"] as const) {
  test(`un fallo de ${failure} muestra un error y conserva IndexedDB`, async ({
    browser,
  }) => {
    const context = await browser.newContext({
      serviceWorkers: "block",
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    await page.goto("http://localhost:4173/mi-dinero-pwa/");
    await expect(
      page.getByRole("button", { name: "Nuevo movimiento", exact: true }),
    ).toBeEnabled();
    await page.evaluate(
      (data) =>
        new Promise<void>((resolve, reject) => {
          const open = indexedDB.open("mi-dinero");
          open.onerror = () => reject(open.error);
          open.onsuccess = () => {
            const db = open.result,
              tx = db.transaction("data", "readwrite");
            tx.objectStore("data").put(data, "main");
            tx.oncomplete = () => {
              db.close();
              resolve();
            };
            tx.onabort = () => reject(tx.error);
          };
        }),
      fixture,
    );
    if (failure === "bundle")
      await page.route("**/assets/index-*.js", (route) =>
        route.abort("failed"),
      );
    else
      await page.route("**/assets/App-*.js", (route) =>
        route.fulfill({
          contentType: "text/javascript",
          body:
            failure === "module"
              ? 'throw new Error("Fallo de módulo de prueba");'
              : 'export default function App(){throw new Error("Fallo de React de prueba")}',
        }),
      );
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "No se pudo abrir la aplicación" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Volver a cargar" }),
    ).toBeVisible();
    await expect(page.locator("#startup-detail")).not.toBeEmpty();
    const stored = await page.evaluate(
      () =>
        new Promise((resolve, reject) => {
          const open = indexedDB.open("mi-dinero");
          open.onerror = () => reject(open.error);
          open.onsuccess = () => {
            const db = open.result,
              tx = db.transaction("data"),
              get = tx.objectStore("data").get("main");
            tx.oncomplete = () => {
              db.close();
              resolve(get.result);
            };
            tx.onabort = () => reject(tx.error);
          };
        }),
    );
    expect(stored).toEqual(fixture);
    await page.unrouteAll();
    await page.getByRole("button", { name: "Volver a cargar" }).click();
    await expect(page.locator(".balance-number")).toContainText("-$50.00");
    await expect(page.locator("#startup-shell")).toBeHidden();
    await context.close();
  });
}
test("IndexedDB no disponible muestra un aviso y la interfaz sigue visible", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "indexedDB", {
      configurable: true,
      get() {
        throw new DOMException(
          "Almacenamiento no disponible en esta sesión",
          "SecurityError",
        );
      },
    });
  });
  await page.goto("./");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Un poco de orden, mucha tranquilidad.",
    }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toContainText(
    "No se pudo abrir el almacenamiento",
  );
  await expect(
    page.getByRole("button", { name: "Nuevo movimiento", exact: true }),
  ).toBeDisabled();
  await expect(page.locator("#startup-shell")).toBeHidden();
});

test("un fallo al cargar el registro PWA no impide iniciar React", async ({
  browser,
}) => {
  const context = await browser.newContext({ serviceWorkers: "block" });
  const page = await context.newPage();
  await page.route("**/assets/virtual_pwa-register-*.js", (route) =>
    route.abort("failed"),
  );
  await page.goto("http://localhost:4173/mi-dinero-pwa/");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Un poco de orden, mucha tranquilidad.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Nuevo movimiento", exact: true }),
  ).toBeEnabled();
  await expect(page.locator("#startup-shell")).toBeHidden();
  await context.close();
});
