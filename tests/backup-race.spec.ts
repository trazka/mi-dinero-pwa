import { revealHomeSummary } from "./home-utils";
import { test, expect } from "@playwright/test";
import { setBackupFile } from "./backup-utils";
test("espera la exportación pendiente y restaura datos distintos aun con IndexedDB ocupado", async ({
  page,
}) => {
  await page.goto("./");
  await expect(
    page.getByRole("button", { name: "Nuevo movimiento", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("navigation", { name: "Navegación principal" })
    .getByRole("button", { name: "Respaldos", exact: true })
    .click();
  const fixture = {
    version: 2,
    debts: [],
    movements: [
      {
        id: "restore-test",
        type: "expense",
        date: "2026-11-11",
        merchant: "Comercio ficticio",
        category: "Otros",
        amount: 50,
        method: "Efectivo",
        notes: "",
      },
    ],
  };
  page.once("dialog", (d) => d.accept());
  await setBackupFile(page, {
    name: "initial.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(fixture)),
  });
  await expect(page.getByRole("status")).toContainText("Datos guardados");
  await page.evaluate(() => window.dispatchEvent(new Event("offline-ready")));
  await expect(page.getByRole("status")).toContainText("Datos guardados");
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open("mi-dinero");
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result,
            tx = db.transaction("data", "readwrite"),
            store = tx.objectStore("data");
          let held = true;
          (
            window as typeof window & { releaseExport: () => void }
          ).releaseExport = () => {
            held = false;
          };
          const pump = () => {
            store.get("main").onsuccess = () => {
              if (held) pump();
            };
          };
          pump();
          tx.oncomplete = () => db.close();
          resolve();
        };
      }),
  );
  const downloaded = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Exportar respaldo JSON", exact: true })
    .click();
  await downloaded;
  await expect(page.locator("input[type=file]")).toBeDisabled();
  const replacement = {
    ...fixture,
    movements: [{ ...fixture.movements[0], amount: 75 }],
  };
  let confirmations = 0;
  page.on("dialog", async (d) => {
    confirmations++;
    await d.accept();
  });
  const importing = setBackupFile(page, {
    name: "replacement.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(replacement)),
  });
  await expect(page.locator("input[type=file]")).toBeDisabled();
  expect(confirmations).toBe(0);
  await page.evaluate(() =>
    (window as typeof window & { releaseExport: () => void }).releaseExport(),
  );
  await importing;
  await expect(page.getByRole("status")).toContainText("Datos guardados");
  expect(confirmations).toBe(1);
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
  expect(stored).toEqual(replacement);
  await page.reload();
  await revealHomeSummary(page);
  await expect(page.locator(".balance-number")).toContainText("-$75.00");
});
