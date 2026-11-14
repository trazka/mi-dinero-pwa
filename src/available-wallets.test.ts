import { describe, it, expect } from "vitest";
import {
  availableWalletBalances,
  walletBalances,
  allocateLegacySavings,
  validateBackup,
  saveMovement,
  type Data,
} from "./data";
import { freeAmount, moveSaving, saveSaving } from "./savings";
import { recordSaving, confirmPending } from "./pending";
const fixture = (bank = 14017.95, cash = 0): Data => ({
  version: 2,
  debts: [],
  movements: [
    {
      id: "bank",
      type: "income",
      amount: bank,
      method: "Transferencia",
      date: "2026-11-01",
      merchant: "Banco",
      category: "Sueldo",
      notes: "",
    },
    ...(cash
      ? [
          {
            id: "cash",
            type: "income" as const,
            amount: cash,
            method: "Efectivo",
            date: "2026-11-01",
            merchant: "Efectivo",
            category: "Otros",
            notes: "",
          },
        ]
      : []),
  ],
  savings: [
    {
      id: "goal",
      name: "Molinillo",
      target: 4500,
      entries: [
        { id: "entry", type: "deposit", amount: 2000, date: "2026-11-01" },
      ],
    },
  ],
});
describe("disponibles sin dinero apartado", () => {
  it("coincide con Inicio y libera en la misma cuenta sin crear ingresos", () => {
    const before = fixture();
    expect(availableWalletBalances(before)).toEqual({
      bank: 12017.95,
      cash: 0,
      unassigned: 0,
    });
    let data = moveSaving(
      before,
      "goal",
      "withdrawal",
      500,
      "2026-11-14",
      "bank",
    );
    expect(availableWalletBalances(data).bank).toBe(12517.95);
    expect(freeAmount(data)).toBe(12517.95);
    data = moveSaving(data, "goal", "withdrawal", 1500, "2026-11-14", "bank");
    expect(availableWalletBalances(data)).toEqual(walletBalances(before));
    expect(data.movements).toEqual(before.movements);
  });
  it("conserva el origen de reservas mixtas tras traspasos y respaldo", () => {
    let data = allocateLegacySavings(fixture(1000, 2000));
    expect(data.savings![0].allocations).toEqual({
      bank: 1000,
      cash: 1000,
      unassigned: 0,
    });
    data = saveMovement(data, {
      ...data.movements[0],
      id: "transfer",
      type: "transfer",
      amount: 500,
      transferDirection: "cash-to-bank",
      method: "Efectivo → Banco",
      category: "Traspaso",
    });
    data = validateBackup(JSON.parse(JSON.stringify(data)));
    expect(availableWalletBalances(data)).toEqual({
      bank: 500,
      cash: 500,
      unassigned: 0,
    });
    expect(() =>
      moveSaving(data, "goal", "withdrawal", 1000.01, "2026-11-14", "bank"),
    ).toThrow();
    data = moveSaving(data, "goal", "withdrawal", 200, "2026-11-14", "cash");
    expect(availableWalletBalances(data)).toEqual({
      bank: 500,
      cash: 700,
      unassigned: 0,
    });
    const wallets = availableWalletBalances(data);
    expect(wallets.bank + wallets.cash + wallets.unassigned).toBe(
      freeAmount(data),
    );
  });
  it("reserva de la cuenta elegida y rechaza una distribución corrupta", () => {
    let data = saveSaving(
      { ...fixture(1000, 2000), savings: [] },
      "Viaje",
      5000,
      "goal",
    );
    data = moveSaving(data, "goal", "deposit", 300, "2026-11-14", "cash");
    expect(availableWalletBalances(data)).toEqual({
      bank: 1000,
      cash: 1700,
      unassigned: 0,
    });
    for (const allocations of [
      { bank: -1, cash: 301, unassigned: 0 },
      { bank: 0, cash: 299, unassigned: 0 },
      { bank: 0, cash: 300.001, unassigned: 0 },
    ]) {
      expect(() =>
        validateBackup({
          ...data,
          savings: [{ ...data.savings![0], allocations }],
        }),
      ).toThrow();
    }
  });
  it("el pendiente conserva su cuenta y solo reserva al confirmar", () => {
    const before = {
      ...fixture(1000, 2000),
      savings: [{ ...fixture().savings![0], entries: [] }],
    };
    let data = recordSaving(before, "goal", 400, "2099-01-01", "cash");
    expect(availableWalletBalances(data)).toEqual(walletBalances(before));
    data = validateBackup(JSON.parse(JSON.stringify(data)));
    data.pendingMovements![0].date = "2026-01-01";
    data = confirmPending(data, data.pendingMovements![0].id);
    expect(availableWalletBalances(data)).toEqual({
      bank: 1000,
      cash: 1600,
      unassigned: 0,
    });
    expect(data.pendingMovements).toHaveLength(0);
  });
});
