import { describe, it, expect, vi, afterEach } from "vitest";
import {
  empty,
  balance,
  validateBackup,
  walletBalances,
  type Movement,
} from "./data";
import { freeAmount } from "./savings";
import { budgetSpent } from "./planning";
import {
  recordMovement,
  recordPayment,
  recordSaving,
  confirmPending,
  cancelPending,
  savePending,
} from "./pending";
afterEach(() => vi.useRealTimers());
const movement = (patch: Partial<Movement> = {}): Movement => ({
  id: "future",
  type: "expense",
  date: "2026-11-19",
  amount: 300,
  merchant: "Pago futuro",
  category: "Transporte",
  method: "Efectivo",
  notes: "",
  ...patch,
});
const base = () => ({
  ...empty(),
  movements: [
    movement({
      id: "salary",
      type: "income",
      date: "2026-11-14",
      amount: 1000,
    }),
  ],
});
const clock = (day: number) => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, day, 12));
};
describe("pendientes de una sola vez", () => {
  it("no descuenta, persiste vencido y se confirma una vez con la fecha real", () => {
    clock(14);
    const pending = recordMovement(base(), movement());
    expect(freeAmount(pending)).toBe(1000);
    expect(walletBalances(pending).cash).toBe(1000);
    expect(
      budgetSpent(pending, { month: "2026-11", category: "", limit: 1000 }),
    ).toBe(0);
    expect(() => confirmPending(pending, "future")).toThrow();
    clock(21);
    const restored = validateBackup(JSON.parse(JSON.stringify(pending)));
    expect(freeAmount(restored)).toBe(1000);
    const done = confirmPending(restored, "future");
    expect(freeAmount(done)).toBe(700);
    expect(done.movements.at(-1)?.date).toBe("2026-11-21");
    expect(done.pendingMovements).toEqual([]);
    expect(() => confirmPending(done, "future")).toThrow();
  });
  it("cambiar fecha y cancelar no afectan saldos; corregir un realizado revierte su efecto", () => {
    clock(14);
    const pending = recordMovement(base(), movement());
    const moved = savePending(pending, {
      ...pending.pendingMovements![0],
      date: "2026-12-01",
    });
    expect(freeAmount(moved)).toBe(1000);
    expect(cancelPending(moved, "future").pendingMovements).toEqual([]);
    const done = recordMovement(base(), movement({ date: "2026-11-14" }));
    expect(freeAmount(done)).toBe(700);
    const corrected = recordMovement(done, movement());
    expect(freeAmount(corrected)).toBe(1000);
    expect(corrected.movements).toHaveLength(1);
  });
  it("compra y abono TDC afectan deuda, dinero y presupuesto solo al confirmar", () => {
    clock(14);
    const card = {
      id: "card",
      creditor: "TDC",
      kind: "credit" as const,
      original: 0,
      initialBalance: 0,
      due: "2026-12-05",
      payments: [],
      charges: [],
    };
    const pending = recordMovement(
      { ...base(), debts: [card] },
      movement({
        method: "Tarjeta de crédito",
        creditDebtId: "card",
        amount: 800,
      }),
    );
    expect(balance(pending.debts[0])).toBe(0);
    clock(19);
    const bought = confirmPending(pending, "future");
    expect(balance(bought.debts[0])).toBe(800);
    expect(freeAmount(bought)).toBe(1000);
    expect(
      budgetSpent(bought, {
        month: "2026-11",
        category: "Transporte",
        limit: 2000,
      }),
    ).toBe(800);
    const payment = recordPayment(bought, "card", 800, "2026-11-20");
    expect(balance(payment.debts[0])).toBe(800);
    clock(20);
    const paid = confirmPending(payment, payment.pendingMovements![0].id);
    expect(balance(paid.debts[0])).toBe(0);
    expect(freeAmount(paid)).toBe(200);
    expect(
      budgetSpent(paid, { month: "2026-11", category: "", limit: 2000 }),
    ).toBe(800);
    expect(validateBackup(paid)).toEqual(paid);
  });
  it("ingresos, apartados y traspasos esperan y validan el saldo al realizarse", () => {
    clock(14);
    const incoming = recordMovement(
      base(),
      movement({ type: "income", amount: 200 }),
    );
    expect(freeAmount(incoming)).toBe(1000);
    const saving = recordSaving(
      {
        ...base(),
        savings: [{ id: "goal", name: "Meta", target: 2000, entries: [] }],
      },
      "goal",
      300,
      "2026-11-19",
    );
    expect(freeAmount(saving)).toBe(1000);
    const transfer = recordMovement(
      base(),
      movement({
        type: "transfer",
        amount: 1500,
        transferDirection: "cash-to-bank",
      }),
    );
    expect(walletBalances(transfer).cash).toBe(1000);
    clock(19);
    expect(freeAmount(confirmPending(incoming, "future"))).toBe(1200);
    expect(
      freeAmount(confirmPending(saving, saving.pendingMovements![0].id)),
    ).toBe(700);
    expect(() => confirmPending(transfer, "future")).toThrow("saldo de origen");
    expect(transfer.pendingMovements).toHaveLength(1);
  });
  it("rechaza respaldos pendientes malformados y conserva respaldos anteriores", () => {
    clock(14);
    expect(validateBackup(base()).pendingMovements).toBeUndefined();
    const pending = recordMovement(base(), movement());
    for (const patch of [
      { amount: -1 },
      { date: "2026-02-30" },
      { type: "other" },
      { recurringId: "rule" },
      { id: "salary" },
    ]) {
      expect(() =>
        validateBackup({
          ...pending,
          pendingMovements: [{ ...pending.pendingMovements![0], ...patch }],
        }),
      ).toThrow();
    }
  });
});
