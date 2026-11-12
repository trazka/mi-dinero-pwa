import { setBackupFile } from "./backup-utils";
import { test, expect } from "@playwright/test";
const base = {
  version: 2,
  movements: [],
  debts: [
    {
      id: "card",
      creditor: "Tarjeta de prueba",
      kind: "credit",
      original: 100,
      initialBalance: 100,
      payments: [],
      charges: [],
      due: "2027-01-05",
    },
  ],
};
async function seed(page: import("@playwright/test").Page, data: unknown) {
  await page.goto("./");
  await expect(
    page.getByRole("button", { name: "Nuevo movimiento", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("navigation", { name: "Navegación principal" })
    .getByRole("button", { name: "Respaldos", exact: true })
    .click();
  page.once("dialog", (d) => d.accept());
  await setBackupFile(page, {
    name: "fixture.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(data)),
  });
  await expect(page.getByRole("status")).toContainText("Datos guardados");
}
test("abono desde movimiento, edición de deuda/corte y búsqueda por importe, método y tarjeta", async ({
  page,
}) => {
  await seed(page, base);
  const nav = page.getByRole("navigation", { name: "Navegación principal" });
  await nav.getByRole("button", { name: "Deudas", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Editar deuda Tarjeta de prueba",
      exact: true,
    })
    .click();
  await page.getByLabel("Acreedor", { exact: true }).fill("Tarjeta renombrada");
  await page.getByLabel("Día de corte (opcional)").fill("31");
  await page.getByLabel("Día límite de pago (opcional)").fill("5");
  await page.getByLabel("Notas de deuda (opcional)").fill("Nota de prueba");
  await expect(page.getByLabel("Importe original (MXN)")).toHaveAttribute(
    "readonly",
    "",
  );
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.locator(".cycle-info")).toContainText("Pendiente al corte");
  await expect(page.locator(".debt-number")).toHaveText("$100.00");
  await nav.getByRole("button", { name: "Inicio", exact: true }).click();
  await page
    .getByRole("button", { name: "Nuevo movimiento", exact: true })
    .click();
  await page.getByLabel("Tipo", { exact: true }).selectOption("payment");
  await page.getByLabel("Importe (MXN)", { exact: true }).fill("40");
  await page.getByLabel("Deuda a abonar").selectOption("card");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.locator(".balance-number")).toContainText("-$40.00");
  await nav.getByRole("button", { name: "Deudas", exact: true }).click();
  await expect(page.locator(".debt-number")).toHaveText("$60.00");
  await page.locator("summary").click();
  await expect(page.locator(".payment")).toHaveCount(1);
  await nav.getByRole("button", { name: "Movimientos", exact: true }).click();
  await page.getByLabel("Buscar movimientos").fill("$40.00");
  await page.getByLabel("Filtrar método").selectOption("Transferencia");
  await page.getByLabel("Filtrar tarjeta o deuda").selectOption("card");
  await expect(page.locator(".movement")).toHaveCount(1);
  await page.getByLabel("Buscar movimientos").fill("inexistente");
  await expect(page.locator(".movement")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Limpiar filtros", exact: true })
    .click();
  await expect(page.locator(".movement")).toHaveCount(1);
  await page.reload();
  await nav.getByRole("button", { name: "Deudas", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Tarjeta renombrada", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".debt-number")).toHaveText("$60.00");
});
test("recurrente requiere confirmación, avanza sin duplicar y presupuesto solo suma el pago", async ({
  page,
}) => {
  await seed(page, base);
  const nav = page.getByRole("navigation", { name: "Navegación principal" });
  await nav.getByRole("button", { name: "Movimientos", exact: true }).click();
  await page
    .getByRole("button", { name: "Crear recurrente", exact: true })
    .click();
  await page.getByLabel("Concepto recurrente").fill("Servicio de prueba");
  await page.getByLabel("Importe recurrente (MXN)").fill("50");
  await page.getByLabel("Categoría recurrente").selectOption("Hogar");
  await page
    .getByRole("button", { name: "Guardar recurrente", exact: true })
    .click();
  await expect(page.getByLabel("Concepto recurrente")).toHaveCount(0);
  await expect(page.locator(".movement")).toHaveCount(0);
  page.once("dialog", (d) => d.dismiss());
  await page
    .getByRole("button", { name: "Registrar Servicio de prueba", exact: true })
    .click();
  await expect(page.locator(".movement")).toHaveCount(0);
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Registrar Servicio de prueba", exact: true })
    .click();
  await expect(page.locator(".movement")).toHaveCount(1);
  await expect(
    page.getByRole("button", {
      name: "Registrar Servicio de prueba",
      exact: true,
    }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Pausar Servicio de prueba", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Reactivar Servicio de prueba",
      exact: true,
    }),
  ).toBeVisible();
  await nav.getByRole("button", { name: "Reportes", exact: true }).click();
  await page.getByText("Configurar presupuesto", { exact: true }).click();
  await page.getByLabel("Límite mensual (MXN)").fill("40");
  await page
    .getByRole("button", { name: "Guardar presupuesto", exact: true })
    .click();
  await expect(page.locator(".budget-over")).toContainText(
    "Excedido por $10.00",
  );
  await page.getByLabel("Categoría del presupuesto").selectOption("Hogar");
  await page.getByLabel("Límite mensual (MXN)").fill("100");
  await page
    .getByRole("button", { name: "Guardar presupuesto", exact: true })
    .click();
  await expect(page.locator(".planning-item")).toHaveCount(2);
  await nav.getByRole("button", { name: "Inicio", exact: true }).click();
  await expect(
    page.getByText("Tus registros aún no tienen respaldo."),
  ).toBeVisible();
  await nav.getByRole("button", { name: "Respaldos", exact: true }).click();
  const event = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Exportar respaldo JSON", exact: true })
    .click();
  const path = await (await event).path();
  await expect(page.locator(".backup-history")).toContainText(
    "Exportación iniciada:",
  );
  await expect(page.locator(".backup-history")).toContainText(
    "Tu respaldo está al día",
  );
  await page.reload();
  await nav.getByRole("button", { name: "Respaldos", exact: true }).click();
  page.once("dialog", (d) => d.accept());
  await setBackupFile(page, path!);
  await expect(page.getByRole("status")).toContainText("Datos guardados");
  await nav.getByRole("button", { name: "Reportes", exact: true }).click();
  await expect(page.locator(".planning-item")).toHaveCount(2);
  await nav.getByRole("button", { name: "Movimientos", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "Reactivar Servicio de prueba",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator(".movement")).toHaveCount(1);
});

test("selección directa de compra TDC y recurrente TDC solo aumentan deuda", async ({
  page,
}) => {
  await seed(page, base);
  const nav = page.getByRole("navigation", { name: "Navegación principal" });
  await nav.getByRole("button", { name: "Movimientos", exact: true }).click();
  await page
    .getByRole("button", { name: "Nuevo movimiento", exact: true })
    .click();
  await page.getByLabel("Tipo", { exact: true }).selectOption("credit");
  await page.getByLabel("Importe (MXN)", { exact: true }).fill("20");
  await page.getByLabel("Establecimiento o concepto").fill("Compra directa");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await page
    .getByRole("button", { name: "Crear recurrente", exact: true })
    .click();
  await page.getByLabel("Concepto recurrente").fill("Compra programada");
  await page.getByLabel("Importe recurrente (MXN)").fill("10");
  await page.getByLabel("Método recurrente").selectOption("Tarjeta de crédito");
  await expect(page.getByLabel("Tarjeta recurrente")).toHaveValue("card");
  await page
    .getByRole("button", { name: "Guardar recurrente", exact: true })
    .click();
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Registrar Compra programada", exact: true })
    .click();
  await expect(page.locator(".movement")).toHaveCount(2);
  await nav.getByRole("button", { name: "Deudas", exact: true }).click();
  await expect(page.locator(".debt-number")).toHaveText("$130.00");
  await nav.getByRole("button", { name: "Inicio", exact: true }).click();
  await expect(page.locator(".balance-number")).toContainText("$0.00");
  await expect(
    page.locator(".stat").filter({ hasText: "Egresos" }),
  ).toContainText("$0.00");
});

test("compras solo ofrecen tarjetas y los abonos conservan tarjeta y coche", async ({
  page,
}) => {
  const car = {
    id: "car",
    creditor: "Coche de prueba",
    original: 500,
    initialBalance: 500,
    payments: [],
    due: "2027-01-05",
  };
  await seed(page, { ...base, debts: [...base.debts, car] });
  const nav = page.getByRole("navigation", { name: "Navegación principal" });
  await nav.getByRole("button", { name: "Movimientos", exact: true }).click();
  await page
    .getByRole("button", { name: "Nuevo movimiento", exact: true })
    .click();
  await page.getByLabel("Método de pago").selectOption("Tarjeta de crédito");
  const cards = page.getByLabel("Tarjeta o deuda vinculada");
  await expect(cards.locator("option")).toHaveText([
    "Selecciona tu tarjeta de crédito",
    "Tarjeta de prueba · $100.00",
  ]);
  await expect(cards).toHaveValue("card");
  await page.getByLabel("Importe (MXN)", { exact: true }).fill("25");
  await page.getByLabel("Establecimiento o concepto").fill("Compra de prueba");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await page
    .getByRole("button", { name: "Nuevo movimiento", exact: true })
    .click();
  await page.getByLabel("Tipo", { exact: true }).selectOption("credit");
  await expect(cards.locator("option")).toHaveText([
    "Selecciona tu tarjeta de crédito",
    "Tarjeta de prueba · $125.00",
  ]);
  await expect(cards).toHaveValue("card");
  await page.getByLabel("Tipo", { exact: true }).selectOption("payment");
  await expect(page.getByLabel("Deuda a abonar").locator("option")).toHaveText([
    "Selecciona una deuda pendiente",
    "Tarjeta de prueba · $125.00",
    "Coche de prueba · $500.00",
  ]);
  await page.getByLabel("Deuda a abonar").selectOption("car");
  await page.getByLabel("Importe (MXN)", { exact: true }).fill("40");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await page.reload();
  await expect(page.locator(".balance-number")).toContainText("-$40.00");
  await nav.getByRole("button", { name: "Deudas", exact: true }).click();
  await expect(page.locator(".debt-number")).toHaveText(["$125.00", "$460.00"]);
});

test("sin tarjetas muestra instrucciones aunque exista una deuda de coche", async ({
  page,
}) => {
  await seed(page, {
    ...base,
    debts: [
      {
        id: "car",
        creditor: "Coche de prueba",
        original: 500,
        initialBalance: 500,
        payments: [],
        due: "2027-01-05",
      },
    ],
  });
  await page
    .getByRole("navigation", { name: "Navegación principal" })
    .getByRole("button", { name: "Movimientos", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Nuevo movimiento", exact: true })
    .click();
  await page.getByLabel("Tipo", { exact: true }).selectOption("credit");
  const cards = page.getByLabel("Tarjeta o deuda vinculada");
  await expect(cards.locator("option")).toHaveCount(1);
  await expect(
    page.getByText(/Primero registra tu tarjeta en Deudas/),
  ).toBeVisible();
  await page.getByLabel("Importe (MXN)", { exact: true }).fill("25");
  await page.getByLabel("Establecimiento o concepto").fill("Compra de prueba");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(
    await cards.evaluate((el: HTMLSelectElement) => el.validity.valueMissing),
  ).toBe(true);
});
