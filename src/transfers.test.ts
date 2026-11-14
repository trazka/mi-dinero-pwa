import { describe, it, expect } from "vitest";
import {
  walletBalances,
  saveMovement,
  removeMovement,
  validateBackup,
  expenseAmount,
  payDebt,
  csv,
  type Data,
  type Movement,
} from "./data";
import { freeAmount } from "./savings";
import { budgetSpent } from "./planning";
import { movementExport } from "./exports";
const income: Movement = {
  id: "salary",
  type: "income",
  date: "2026-11-13",
  merchant: "Nómina",
  category: "Sueldo",
  amount: 7000,
  method: "Transferencia",
  notes: "",
};
const fixture = (): Data => ({
  version: 2,
  movements: [
    income,
    { ...income, id: "cash", amount: 100, method: "Efectivo" },
  ],
  debts: [],
  savings: [
    {
      id: "goal",
      name: "Meta",
      target: 3000,
      entries: [
        { id: "entry", type: "deposit", amount: 2000, date: income.date },
      ],
    },
  ],
});
const transfer = (
  amount = 1000,
  direction: Movement["transferDirection"] = "bank-to-cash",
): Movement => ({
  ...income,
  id: "transfer",
  type: "transfer",
  merchant: "Retiro",
  category: "Traspaso",
  method: "Banco → Efectivo",
  amount,
  transferDirection: direction,
});
describe("traspasos entre banco y efectivo", () => {
  it("mueve incluso dinero apartado sin crear ingresos/gastos ni cambiar el disponible", () => {
    const before = fixture(),
      after = saveMovement(before, transfer(6000));
    expect(walletBalances(after)).toEqual({
      bank: 1000,
      cash: 6100,
      unassigned: 0,
    });
    expect(freeAmount(after)).toBe(freeAmount(before));
    expect(after.movements.reduce((s, m) => s + expenseAmount(m), 0)).toBe(0);
    expect(after.movements.filter((m) => m.type === "income")).toHaveLength(2);
    expect(
      budgetSpent(after, { month: "2026-11", category: "", limit: 1000 }),
    ).toBe(0);
    expect(validateBackup(JSON.parse(JSON.stringify(after)))).toEqual(after);
  });
  it("editar, depositar y eliminar recalculan ambas bolsas sin duplicar dinero", () => {
    let data = saveMovement(fixture(), transfer());
    data = saveMovement(data, transfer(1500));
    expect(walletBalances(data)).toEqual({
      bank: 5500,
      cash: 1600,
      unassigned: 0,
    });
    data = saveMovement(data, {
      ...transfer(500, "cash-to-bank"),
      id: "deposit",
    });
    expect(walletBalances(data)).toEqual({
      bank: 6000,
      cash: 1100,
      unassigned: 0,
    });
    data = removeMovement(data, "deposit");
    data = removeMovement(data, "transfer");
    expect(walletBalances(data)).toEqual(walletBalances(fixture()));
    expect(freeAmount(data)).toBe(5100);
  });
  it("rechaza saldo insuficiente, importes inválidos y vínculos ajenos al traspaso", () => {
    for (const movement of [
      transfer(7000.01),
      transfer(0),
      transfer(-1),
      transfer(1.001),
      transfer(101, "cash-to-bank"),
      { ...transfer(), transferDirection: undefined },
      { ...transfer(), creditDebtId: "card" },
    ]) {
      expect(() => saveMovement(fixture(), movement)).toThrow();
    }
    expect(() =>
      validateBackup({
        ...fixture(),
        movements: [
          ...fixture().movements,
          { ...transfer(), transferDirection: "wrong" },
        ],
      }),
    ).toThrow();
  });
  it("clasifica solo métodos conocidos y no cuenta la compra TDC como salida bancaria", () => {
    let data: Data = {
      version: 2,
      movements: [
        income,
        { ...income, id: "cash", amount: 300, method: "Efectivo" },
      ],
      debts: [
        {
          id: "card",
          kind: "credit",
          creditor: "Tarjeta",
          original: 1000,
          initialBalance: 1000,
          due: "2026-12-01",
          payments: [],
          charges: [],
        },
      ],
    };
    data = saveMovement(data, {
      ...income,
      id: "debit",
      type: "expense",
      amount: 200,
      method: "Tarjeta de débito",
    });
    data = saveMovement(data, {
      ...income,
      id: "unknown",
      type: "expense",
      amount: 50,
      method: "Otro",
    });
    data = saveMovement(data, {
      ...income,
      id: "charge",
      type: "expense",
      amount: 500,
      method: "Tarjeta de crédito",
      creditDebtId: "card",
    });
    data = payDebt(data, "card", 100, income.date);
    expect(walletBalances(data)).toEqual({
      bank: 6700,
      cash: 300,
      unassigned: -50,
    });
    expect(freeAmount(data)).toBe(6950);
  });
  it("exporta como Traspaso con origen/destino y gasto contabilizado cero", () => {
    const table = movementExport([transfer()], "Traspasos", []);
    expect(table.totals).toEqual([["Traspasos (sin ingreso ni gasto)", 1000]]);
    expect(table.rows[0][1]).toBe("Traspaso");
    expect(table.rows[0][6]).toBe(0);
    expect(table.rows[0].slice(8)).toEqual(["Banco", "Efectivo"]);
    expect(csv([transfer()])).toContain('"Traspaso"');
  });
});
