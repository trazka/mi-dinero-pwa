import { describe, it, expect } from "vitest";
import {
  installmentSchedule,
  suggestedCut,
  effectiveFirstCut,
} from "./installments";
import {
  saveMovement,
  validateBackup,
  balance,
  payDebt,
  removeMovement,
  type Data,
  type Movement,
  type Debt,
} from "./data";
import { cardCycle, budgetSpent } from "./planning";
import { recordMovement, confirmPending } from "./pending";
const card: Debt = {
  id: "card",
  creditor: "BBVA",
  kind: "credit",
  original: 0,
  initialBalance: 0,
  due: "2026-12-10",
  cutDay: 21,
  paymentDay: 10,
  payments: [],
  charges: [],
};
const fixture = (): Data => ({
  version: 2,
  debts: [structuredClone(card)],
  movements: [],
});
const purchase: Movement = {
  id: "purchase",
  type: "expense",
  amount: 6000,
  date: "2026-11-15",
  merchant: "Laptop",
  category: "Compras",
  method: "Tarjeta de crédito",
  creditDebtId: "card",
  notes: "",
  msi: { months: 6, firstCut: "2026-11-21" },
};
describe("compras MSI", () => {
  it("sugiere corte antes, durante y después del corte y ajusta días cortos", () => {
    expect(suggestedCut("2026-11-15", card)).toBe("2026-11-21");
    expect(suggestedCut("2026-11-21", card)).toBe("2026-11-21");
    expect(suggestedCut("2026-11-22", card)).toBe("2026-12-21");
    expect(suggestedCut("2028-02-28", { ...card, cutDay: 31 })).toBe(
      "2028-02-29",
    );
    expect(suggestedCut("2026-11-15", { ...card, cutDay: undefined })).toBe("");
  });
  it("distribuye el total exacto con remanente final y fechas de pago posteriores al corte", () => {
    const schedule = installmentSchedule(
      { ...purchase, amount: 100, msi: { months: 3, firstCut: "2027-01-31" } },
      { ...card, cutDay: 31 },
    );
    expect(schedule.map((p) => p.cut)).toEqual([
      "2027-01-31",
      "2027-02-28",
      "2027-03-31",
    ]);
    expect(schedule.map((p) => p.due)).toEqual([
      "2027-02-10",
      "2027-03-10",
      "2027-04-10",
    ]);
    expect(schedule.map((p) => p.amount)).toEqual([33.33, 33.33, 33.34]);
    expect(schedule.reduce((s, p) => s + Math.round(p.amount * 100), 0)).toBe(
      10000,
    );
    expect(
      installmentSchedule(purchase, { ...card, cutDay: 5, paymentDay: 20 })[0]
        .due,
    ).toBe("2026-12-20");
  });
  it("no duplica deuda ni presupuesto, y al corte solo incorpora las mensualidades exigibles", () => {
    let data = saveMovement(fixture(), purchase);
    expect(balance(data.debts[0])).toBe(6000);
    expect(
      budgetSpent(data, {
        month: "2026-11",
        category: "Compras",
        limit: 10000,
      }),
    ).toBe(6000);
    expect(cardCycle(data.debts[0], data, "2026-11-20")!.amount).toBe(0);
    expect(cardCycle(data.debts[0], data, "2026-11-21")!.amount).toBe(1000);
    data = payDebt(data, "card", 1000, "2026-11-25");
    expect(balance(data.debts[0])).toBe(5000);
    expect(cardCycle(data.debts[0], data, "2026-12-21")!.amount).toBe(1000);
    expect(
      validateBackup(JSON.parse(JSON.stringify(data))).movements[0].msi,
    ).toEqual(purchase.msi);
  });
  it("editar el plan conserva una sola compra; quitar MSI o eliminar recalcula el corte", () => {
    let data = saveMovement(fixture(), purchase);
    data = saveMovement(data, {
      ...purchase,
      msi: { months: 3, firstCut: "2026-12-21" },
    });
    expect(data.debts[0].charges).toHaveLength(1);
    expect(cardCycle(data.debts[0], data, "2026-11-21")!.amount).toBe(0);
    expect(cardCycle(data.debts[0], data, "2026-11-21")!.nextDue).toBe(
      "2027-01-10",
    );
    expect(cardCycle(data.debts[0], data, "2026-12-21")!.amount).toBe(2000);
    data = saveMovement(data, { ...purchase, msi: undefined });
    expect(cardCycle(data.debts[0], data, "2026-11-21")!.amount).toBe(6000);
    expect(balance(removeMovement(data, purchase.id).debts[0])).toBe(0);
  });
  it("rechaza planes inválidos al guardar e importar y conserva respaldos anteriores", () => {
    for (const patch of [
      { msi: { months: 1, firstCut: "2026-11-21" } },
      { msi: { months: 6, firstCut: "2026-02-30" } },
      { msi: { months: 6, firstCut: "2026-11-01" } },
      { type: "income" },
      { method: "Efectivo" },
      { creditDebtId: undefined },
      { amount: 0.01 },
    ]) {
      const invalid = { ...purchase, ...patch } as Movement;
      expect(() => saveMovement(fixture(), invalid)).toThrow();
      const data = saveMovement(fixture(), purchase);
      data.movements[0] = invalid;
      expect(() => validateBackup(data)).toThrow();
    }
    expect(
      validateBackup(saveMovement(fixture(), { ...purchase, msi: undefined }))
        .movements[0].msi,
    ).toBeUndefined();
  });
  it("un pendiente MSI no carga deuda y se ajusta el corte si se confirma tarde", () => {
    const data = recordMovement(fixture(), {
      ...purchase,
      date: "2099-01-01",
      msi: { months: 6, firstCut: "2099-01-21" },
    });
    expect(data.movements).toHaveLength(0);
    expect(balance(data.debts[0])).toBe(0);
    expect(validateBackup(data).pendingMovements![0].msi!.months).toBe(6);
    expect(effectiveFirstCut("2026-10-21", "2026-11-22", card)).toBe(
      "2026-12-21",
    );
    const pending = {
      ...purchase,
      date: "2020-01-01",
      msi: { months: 6, firstCut: "2020-01-21" },
    };
    const late = confirmPending(
      { ...fixture(), pendingMovements: [pending] },
      pending.id,
      "2026-11-15",
    );
    expect(late.movements[0].msi!.firstCut).toBe("2026-11-21");
    expect(balance(late.debts[0])).toBe(6000);
  });
});
