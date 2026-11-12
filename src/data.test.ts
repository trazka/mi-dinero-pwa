import "fake-indexeddb/auto";
import { describe, it, expect } from "vitest";
import {
  balance,
  changeData,
  csv,
  empty,
  payDebt,
  readData,
  removeMovement,
  validateBackup,
  validDate,
  type Data,
} from "./data";
const fixture = (): Data => ({
  ...empty(),
  debts: [
    {
      id: "debt",
      creditor: "Acreedor de prueba",
      original: 1000,
      initialBalance: 800,
      due: "2026-12-01",
      payments: [],
    },
  ],
});
describe("Abonos y gastos vinculados", () => {
  it("crea exactamente un gasto y reduce el saldo sin contabilizar la deuda como gasto", () => {
    const d = payDebt(fixture(), "debt", 200, "2026-11-11");
    expect(d.movements).toHaveLength(1);
    expect(d.movements[0].amount).toBe(200);
    expect(balance(d.debts[0])).toBe(600);
    expect(validateBackup(d)).toEqual(d);
  });
  it("revierte ambos registros al eliminar el gasto", () => {
    let d = payDebt(fixture(), "debt", 200, "2026-11-11");
    d = removeMovement(d, d.movements[0].id);
    expect(d.movements).toHaveLength(0);
    expect(d.debts[0].payments).toHaveLength(0);
    expect(balance(d.debts[0])).toBe(800);
  });
  it("rechaza sobrepagos, importes negativos, decimales inválidos y fechas inexistentes", () => {
    for (const n of [801, -1, 0, NaN, 1.001])
      expect(() => payDebt(fixture(), "debt", n, "2026-11-11")).toThrow();
    expect(() => payDebt(fixture(), "debt", 2, "2026-02-30")).toThrow();
  });
  it("evita errores de redondeo al saldar", () => {
    let d = fixture();
    d.debts[0].initialBalance = 0.3;
    d = payDebt(d, "debt", 0.1, "2026-11-11");
    d = payDebt(d, "debt", 0.2, "2026-11-11");
    expect(balance(d.debts[0])).toBe(0);
  });
});
describe("Respaldos", () => {
  it("restaura datos completos y rechaza versiones desconocidas", () => {
    expect(validateBackup(JSON.parse(JSON.stringify(fixture())))).toEqual(
      fixture(),
    );
    expect(() => validateBackup({ ...fixture(), version: 3 })).toThrow();
  });
  it("rechaza gastos huérfanos, vínculos duplicados y saldos alterados", () => {
    const d = payDebt(fixture(), "debt", 200, "2026-11-11");
    expect(() => validateBackup({ ...d, debts: [] })).toThrow();
    const copy = structuredClone(d);
    copy.debts[0].payments[0].amount = 199;
    expect(() => validateBackup(copy)).toThrow();
    expect(() =>
      validateBackup({ ...d, movements: [...d.movements, d.movements[0]] }),
    ).toThrow();
  });
  it("escapa CSV y neutraliza fórmulas", () => {
    const d = payDebt(fixture(), "debt", 20, "2026-11-11");
    d.movements[0].merchant = "=SUM(1,2)";
    d.movements[0].notes = 'Una "nota", con coma\ny salto';
    const out = csv(d.movements);
    expect(out).toContain('"\'=SUM(1,2)"');
    expect(out).toContain('"Una ""nota"", con coma\ny salto"');
  });
  it("valida fechas reales", () => {
    expect(validDate("2024-02-29")).toBe(true);
    expect(validDate("2025-02-29")).toBe(false);
  });
});
describe("Persistencia IndexedDB", () => {
  it("persiste y serializa cambios concurrentes sin perder registros", async () => {
    await changeData(() => fixture());
    await Promise.all([
      changeData((d) => payDebt(d, "debt", 10, "2026-11-11")),
      changeData((d) => payDebt(d, "debt", 20, "2026-11-11")),
    ]);
    const d = await readData();
    expect(d.movements).toHaveLength(2);
    expect(balance(d.debts[0])).toBe(770);
  });
  it("conserva datos si una mutación falla", async () => {
    const before = await readData();
    await expect(
      changeData((d) => payDebt(d, "debt", 999999, "2026-11-11")),
    ).rejects.toThrow();
    expect(await readData()).toEqual(before);
  });
});
