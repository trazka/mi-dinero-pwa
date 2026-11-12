import "fake-indexeddb/auto";
import { describe, it, expect } from "vitest";
import {
  empty,
  saveMovement,
  payDebt,
  removeMovement,
  balance,
  expenseAmount,
  validateBackup,
  changeData,
  readData,
  csv,
  type Data,
  type Movement,
} from "./data";
const fixture = (): Data => ({
  ...empty(),
  debts: [
    {
      id: "card",
      creditor: "Tarjeta ficticia",
      kind: "credit",
      original: 0,
      initialBalance: 0,
      due: "2027-01-01",
      payments: [],
      charges: [],
    },
    {
      id: "other",
      creditor: "Otra tarjeta",
      kind: "credit",
      original: 0,
      initialBalance: 0,
      due: "2027-01-01",
      payments: [],
      charges: [],
    },
  ],
});
const purchase = (amount = 100): Movement => ({
  id: "purchase",
  type: "expense",
  date: "2026-11-11",
  merchant: "Comercio ficticio",
  category: "Compras",
  amount,
  method: "Tarjeta de crédito",
  notes: "",
  creditDebtId: "card",
});
const total = (d: Data) =>
  d.movements.reduce((sum, m) => sum + expenseAmount(m), 0);
describe("Compras vinculadas y abonos de tarjeta", () => {
  it("crea un cargo y cuenta solo la compra; abonar no duplica el gasto", () => {
    let d = saveMovement(fixture(), purchase());
    expect(balance(d.debts[0])).toBe(100);
    expect(total(d)).toBe(100);
    d = payDebt(d, "card", 40, "2026-11-11");
    expect(balance(d.debts[0])).toBe(60);
    expect(total(d)).toBe(100);
    expect(d.movements).toHaveLength(2);
    expect(d.movements[1].creditPaymentDebtId).toBe("card");
    expect(validateBackup(d)).toEqual(d);
    expect(csv(d.movements)).toContain("Abono de tarjeta (sin gasto)");
  });
  it("editar varias veces, cambiar importe y cambiar de tarjeta no duplica cargos", () => {
    let d = saveMovement(fixture(), purchase());
    d = saveMovement(d, purchase(120));
    d = saveMovement(d, purchase(120));
    expect(balance(d.debts[0])).toBe(120);
    expect(d.debts[0].charges).toHaveLength(1);
    d = saveMovement(d, { ...purchase(120), creditDebtId: "other" });
    expect(balance(d.debts[0])).toBe(0);
    expect(balance(d.debts[1])).toBe(120);
    expect(validateBackup(d)).toEqual(d);
  });
  it("cambiar método o tipo retira el cargo sin eliminar el movimiento", () => {
    let d = saveMovement(fixture(), purchase());
    d = saveMovement(d, { ...purchase(), method: "Efectivo" });
    expect(balance(d.debts[0])).toBe(0);
    expect(d.movements[0].creditDebtId).toBeUndefined();
    expect(total(d)).toBe(100);
    d = saveMovement(d, purchase());
    d = saveMovement(d, { ...purchase(), type: "income" });
    expect(balance(d.debts[0])).toBe(0);
    expect(total(d)).toBe(0);
  });
  it("eliminar compra revierte la deuda y eliminar abono la restaura", () => {
    let d = saveMovement(fixture(), purchase());
    d = payDebt(d, "card", 40, "2026-11-11");
    d = removeMovement(d, d.movements.find((m) => m.paymentId)!.id);
    expect(balance(d.debts[0])).toBe(100);
    expect(total(d)).toBe(100);
    d = removeMovement(d, "purchase");
    expect(balance(d.debts[0])).toBe(0);
    expect(total(d)).toBe(0);
  });
  it("no permite reducir/eliminar/reasignar compras pagadas hasta revertir abonos", () => {
    let d = saveMovement(fixture(), purchase());
    d = payDebt(d, "card", 100, "2026-11-11");
    expect(() => removeMovement(d, "purchase")).toThrow("revierte");
    expect(() => saveMovement(d, purchase(90))).toThrow("revierte");
    expect(() =>
      saveMovement(d, { ...purchase(), creditDebtId: "other" }),
    ).toThrow("revierte");
    expect(balance(d.debts[0])).toBe(0);
  });
  it("exige tarjeta válida para nuevas compras y rechaza sobrepagos", () => {
    expect(() =>
      saveMovement(fixture(), { ...purchase(), creditDebtId: undefined }),
    ).toThrow("Selecciona");
    expect(() =>
      saveMovement(fixture(), { ...purchase(), creditDebtId: "missing" }),
    ).toThrow();
    const d = saveMovement(fixture(), purchase());
    expect(() => payDebt(d, "card", 101, "2026-11-11")).toThrow();
  });
  it("conserva registros anteriores y abonos históricos al vincular una deuda existente", () => {
    const d = fixture();
    delete d.debts[0].kind;
    delete d.debts[0].charges;
    d.debts[0].original = 100;
    d.debts[0].initialBalance = 100;
    const paid = payDebt(d, "card", 10, "2026-11-11");
    const linked = saveMovement(paid, purchase(20));
    expect(balance(linked.debts[0])).toBe(110);
    expect(total(linked)).toBe(30);
    const next = payDebt(linked, "card", 10, "2026-11-11");
    expect(total(next)).toBe(30);
    const legacy = { ...purchase(), creditDebtId: undefined };
    const previous = { ...fixture(), movements: [legacy] };
    const edited = saveMovement(previous, { ...legacy, notes: "Nota editada" });
    expect(balance(edited.debts[0])).toBe(0);
    expect(edited.movements[0].notes).toBe("Nota editada");
  });
  it("importa versión 1 sin perder datos y exporta versión 2 sin perder vínculos", () => {
    const old = {
      version: 1,
      movements: [],
      debts: [
        {
          id: "legacy",
          creditor: "Prueba",
          original: 50,
          initialBalance: 30,
          due: "2027-01-01",
          payments: [],
        },
      ],
    };
    expect(validateBackup(old)).toEqual({ ...old, version: 2 });
    const d = payDebt(
      saveMovement(fixture(), purchase()),
      "card",
      40,
      "2026-11-11",
    );
    expect(validateBackup(JSON.parse(JSON.stringify(d)))).toEqual(d);
  });
  it("rechaza cargos huérfanos, duplicados, importes alterados y pagos falsamente excluidos", () => {
    const d = saveMovement(fixture(), purchase());
    const duplicate = structuredClone(d);
    duplicate.debts[0].charges!.push(duplicate.debts[0].charges![0]);
    expect(() => validateBackup(duplicate)).toThrow();
    const broken = structuredClone(d);
    broken.debts[0].charges![0].amount = 99;
    expect(() => validateBackup(broken)).toThrow();
    expect(() => validateBackup({ ...d, debts: [] })).toThrow();
    expect(() =>
      validateBackup({
        ...d,
        movements: [{ ...d.movements[0], creditPaymentDebtId: "card" }],
      }),
    ).toThrow();
  });
  it("serializa dos compras concurrentes y persiste los vínculos de tarjeta", async () => {
    await changeData(() => fixture());
    await Promise.all([
      changeData((d) => saveMovement(d, purchase())),
      changeData((d) => saveMovement(d, { ...purchase(50), id: "second" })),
    ]);
    const d = await readData();
    expect(balance(d.debts[0])).toBe(150);
    expect(total(d)).toBe(150);
    expect(validateBackup(d)).toEqual(d);
  });
});

it("actualiza datos locales de versión 1 sin borrar movimientos ni saldos", async () => {
  const { openDB } = await import("idb");
  const db = await openDB("mi-dinero", 1);
  const old = {
    version: 1,
    movements: [{ ...purchase(30), creditDebtId: undefined }],
    debts: [
      {
        id: "existing",
        creditor: "Deuda anterior",
        original: 100,
        initialBalance: 80,
        due: "2027-01-01",
        payments: [],
      },
    ],
  };
  await db.put("data", old, "main");
  const loaded = await readData();
  expect(loaded.version).toBe(2);
  expect(loaded.movements).toEqual(old.movements);
  expect(balance(loaded.debts[0])).toBe(80);
  await changeData((d) => ({
    ...d,
    movements: [
      ...d.movements,
      {
        ...purchase(10),
        id: "cash",
        creditDebtId: undefined,
        method: "Efectivo",
      },
    ],
  }));
  const stored = await db.get("data", "main");
  expect(stored.version).toBe(2);
  expect(stored.movements).toHaveLength(2);
  expect(balance(stored.debts[0])).toBe(80);
});
