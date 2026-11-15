import { test, expect } from "@playwright/test";
import { setBackupFile } from "./backup-utils";
import { chooseDate } from "./date-utils";
import { selectAllMovements } from "./movement-utils";
import { exportText } from "./export-utils";

test("compra MSI calcula mensualidad, conserva corte editado, deuda total y respaldo", async ({
  page,
}) => {
  await page.goto("./");
  const nav = page.getByRole("navigation", { name: "Navegación principal" });
  await nav.getByRole("button", { name: "Respaldos", exact: true }).click();
  page.once("dialog", (d) => d.accept());
  await setBackupFile(page, {
    name: "msi.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        version: 2,
        movements: [],
        debts: [
          {
            id: "card",
            kind: "credit",
            creditor: "BBVA",
            original: 0,
            initialBalance: 0,
            due: "2026-12-10",
            cutDay: 21,
            paymentDay: 10,
            charges: [],
            payments: [],
          },
        ],
      }),
    ),
  });
  await expect(page.getByRole("status")).toContainText("Datos guardados");
  await nav.getByRole("button", { name: "Movimientos", exact: true }).click();
  await selectAllMovements(page);
  await page
    .getByRole("button", { name: "Nuevo movimiento", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Nuevo movimiento",
    exact: true,
  });
  await expect(dialog.getByLabel("A meses sin intereses")).toHaveCount(0);
  await dialog.getByLabel("Tipo", { exact: true }).selectOption("credit");
  await dialog.getByLabel("Importe (MXN)", { exact: true }).fill("6000");
  await dialog
    .getByLabel("Establecimiento o concepto", { exact: true })
    .fill("Refrigerador MSI");
  await chooseDate(page, "Fecha", "2026-11-12");
  await dialog.getByLabel("A meses sin intereses").check();
  await expect(
    dialog.getByLabel("Primer corte de cobro", { exact: true }),
  ).toContainText("21 nov 2026");
  await expect(dialog).toContainText("6 mensualidades de $1,000.00");
  await dialog.getByLabel("Número de meses", { exact: true }).fill("12");
  await expect(dialog).toContainText("12 mensualidades de $500.00");
  await chooseDate(page, "Primer corte de cobro", "2026-12-21");
  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator(".movement")).toHaveCount(1);
  await expect(page.locator(".movement")).toContainText(
    "12 MSI · Primer corte: 21-dic-2026",
  );
  await page
    .getByRole("button", { name: "Editar Refrigerador MSI", exact: true })
    .click();
  const edit = page.getByRole("dialog", {
    name: "Editar movimiento",
    exact: true,
  });
  await expect(edit.getByLabel("A meses sin intereses")).toBeChecked();
  await expect(
    edit.getByLabel("Primer corte de cobro", { exact: true }),
  ).toContainText("21 dic 2026");
  await expect(edit.getByLabel("Número de meses", { exact: true })).toHaveValue(
    "12",
  );
  await edit.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(edit).toHaveCount(0);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Excel", exact: true }).click();
  const exported = await exportText(await download);
  expect(exported).toContain("Meses sin intereses");
  expect(exported).toContain("21-dic-2026");
  await nav.getByRole("button", { name: "Deudas", exact: true }).click();
  await expect(page.locator(".debt-number")).toHaveText("$6,000.00");
  await page.locator(".msi-projection > summary").click();
  await page.locator(".msi-projection details > summary").click();
  await expect(page.locator(".msi-schedule li")).toHaveCount(12);
  await expect(page.locator(".msi-schedule li").first()).toContainText(
    "Pago: 10-ene-2027",
  );
  await expect(page.locator(".msi-schedule li").first()).toContainText(
    "$500.00",
  );
  await nav.getByRole("button", { name: "Respaldos", exact: true }).click();
  const backupDownload = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Exportar respaldo JSON", exact: true })
    .click();
  const { readFile } = await import("node:fs/promises");
  const backup = JSON.parse(
    await readFile((await (await backupDownload).path())!, "utf8"),
  );
  expect(backup.movements).toHaveLength(1);
  expect(backup.debts[0].charges).toHaveLength(1);
  expect(backup.movements[0].msi).toEqual({
    months: 12,
    firstCut: "2026-12-21",
  });
  page.once("dialog", (d) => d.accept());
  await setBackupFile(page, {
    name: "restored.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await expect(page.getByRole("status")).toContainText("Datos guardados");
  await nav.getByRole("button", { name: "Movimientos", exact: true }).click();
  await selectAllMovements(page);
  await page
    .getByRole("button", { name: "Editar Refrigerador MSI", exact: true })
    .click();
  await page.getByLabel("A meses sin intereses").uncheck();
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.locator(".movement")).not.toContainText("Primer corte:");
});

test("editar una compra antigua sin vínculo no la carga automáticamente a una tarjeta", async ({
  page,
}) => {
  await page.goto("./");
  const nav = page.getByRole("navigation", { name: "Navegación principal" });
  await nav.getByRole("button", { name: "Respaldos", exact: true }).click();
  page.once("dialog", (d) => d.accept());
  await setBackupFile(page, {
    name: "legacy.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        version: 2,
        movements: [
          {
            id: "old",
            type: "expense",
            amount: 100,
            date: "2026-11-12",
            merchant: "Compra antigua",
            category: "Otros",
            method: "Tarjeta de crédito",
            notes: "",
          },
        ],
        debts: [
          {
            id: "card",
            kind: "credit",
            creditor: "BBVA",
            original: 100,
            initialBalance: 100,
            due: "2026-12-10",
            cutDay: 21,
            paymentDay: 10,
            charges: [],
            payments: [],
          },
        ],
      }),
    ),
  });
  await expect(page.getByRole("status")).toContainText("Datos guardados");
  await nav.getByRole("button", { name: "Movimientos", exact: true }).click();
  await selectAllMovements(page);
  await page
    .getByRole("button", { name: "Editar Compra antigua", exact: true })
    .click();
  const edit = page.getByRole("dialog", {
    name: "Editar movimiento",
    exact: true,
  });
  await expect(edit.getByLabel("Tarjeta o deuda vinculada")).toHaveValue("");
  await expect(edit.getByLabel("A meses sin intereses")).toBeDisabled();
  await edit.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(edit).toHaveCount(0);
  await nav.getByRole("button", { name: "Deudas", exact: true }).click();
  await expect(page.locator(".debt-number")).toHaveText("$100.00");
});
