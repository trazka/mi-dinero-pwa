import "fake-indexeddb/auto";
import { describe, it, expect } from "vitest";
import {
  empty,
  expenseAmount,
  validateBackup,
  changeData,
  readData,
  type Data,
} from "./data";
import {
  saveSaving,
  moveSaving,
  freeAmount,
  savedAmount,
  reservedAmount,
  removeSaving,
} from "./savings";
const initial = (): Data => ({
  ...empty(),
  movements: [
    {
      id: "income",
      type: "income",
      amount: 1000,
      date: "2026-11-12",
      merchant: "Prueba",
      category: "Sueldo",
      method: "Efectivo",
      notes: "",
    },
  ],
});
describe("apartados sin alterar la contabilidad", () => {
  it("aparta centavos, retira y conserva exactamente movimientos y deudas", () => {
    const before = initial();
    let data = saveSaving(before, "Emergencias", 800);
    const id = data.savings![0].id;
    data = moveSaving(data, id, "deposit", 123.45);
    expect(reservedAmount(data)).toBe(123.45);
    expect(freeAmount(data)).toBe(876.55);
    data = moveSaving(data, id, "withdrawal", 23.45);
    expect(savedAmount(data.savings![0])).toBe(100);
    expect(freeAmount(data)).toBe(900);
    expect(data.movements).toEqual(before.movements);
    expect(data.debts).toEqual(before.debts);
    expect(data.movements.reduce((s, m) => s + expenseAmount(m), 0)).toBe(0);
    expect(before.savings).toBeUndefined();
  });
  it("impide apartar fondos inexistentes y retirar más que el saldo", () => {
    let data = saveSaving(initial(), "Viaje", 500);
    const id = data.savings![0].id;
    expect(() => moveSaving(data, id, "deposit", 1000.01)).toThrow(
      "dinero libre",
    );
    data = moveSaving(data, id, "deposit", 500);
    const second = saveSaving(data, "Otra meta", 500);
    expect(() =>
      moveSaving(second, second.savings![1].id, "deposit", 500.01),
    ).toThrow();
    expect(() => moveSaving(data, id, "withdrawal", 500.01)).toThrow("saldo");
    for (const amount of [0, -1, NaN, Infinity, 0.001])
      expect(() => moveSaving(data, id, "deposit", amount)).toThrow();
    expect(() => saveSaving(data, "", 100)).toThrow();
    expect(() => saveSaving(data, "Meta", 0)).toThrow();
  });
  it("editar la meta conserva el historial; exportar/importar y persistir no duplica aportaciones", async () => {
    let data = saveSaving(initial(), "Inicial", 100);
    const id = data.savings![0].id;
    data = moveSaving(data, id, "deposit", 100);
    data = saveSaving(data, "Nueva meta", 200, id);
    expect(data.savings![0].entries).toHaveLength(1);
    await changeData(() => validateBackup(JSON.parse(JSON.stringify(data))));
    expect(await readData()).toEqual(data);
    await changeData(() => validateBackup(data));
    expect(reservedAmount(await readData())).toBe(100);
    expect(validateBackup(empty()).savings).toBeUndefined();
  });
  it("rechaza respaldos con historial negativo, identificadores repetidos o importes inválidos", () => {
    let data = saveSaving(initial(), "Prueba", 200);
    data = moveSaving(data, data.savings![0].id, "deposit", 100);
    const corrupt = structuredClone(data);
    corrupt.savings![0].entries[0].type = "withdrawal";
    expect(() => validateBackup(corrupt)).toThrow();
    const duplicate = structuredClone(data);
    duplicate.savings![0].entries.push(duplicate.savings![0].entries[0]);
    expect(() => validateBackup(duplicate)).toThrow();
    const invalid = structuredClone(data);
    invalid.savings![0].target = -1;
    expect(() => validateBackup(invalid)).toThrow();
  });
});

it("solo elimina apartados sin fondos y avisa saldo libre negativo sin cambiar gastos", () => {
  let data = saveSaving(initial(), "Meta", 1000);
  const id = data.savings![0].id;
  data = moveSaving(data, id, "deposit", 1000);
  expect(() => removeSaving(data, id)).toThrow();
  data = {
    ...data,
    movements: [
      ...data.movements,
      { ...data.movements[0], id: "expense", type: "expense", amount: 200 },
    ],
  };
  expect(freeAmount(data)).toBe(-200);
  expect(reservedAmount(data)).toBe(1000);
  data = moveSaving(data, id, "withdrawal", 1000);
  expect(removeSaving(data, id).savings).toHaveLength(0);
  expect(data.movements).toHaveLength(2);
});

it("la aportación conserva la fecha elegida y rechaza fechas inválidas", () => {
  const data = saveSaving(initial(), "Prueba", 1000);
  const id = data.savings![0].id;
  expect(
    moveSaving(data, id, "deposit", 100, "2026-10-15").savings![0].entries[0]
      .date,
  ).toBe("2026-10-15");
  expect(() => moveSaving(data, id, "deposit", 100, "2026-02-30")).toThrow();
});
