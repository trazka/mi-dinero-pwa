import "fake-indexeddb/auto";
import { describe, it, expect } from "vitest";
import {
  balance,
  changeData,
  empty,
  payDebt,
  readData,
  saveMovement,
  today,
  validateBackup,
  type Data,
  type Recurring,
  type Movement,
} from "./data";
import {
  backupOverdue,
  budgetSpent,
  cardCycle,
  editDebt,
  matchesSearch,
  movementDebtId,
  nextOccurrence,
  registerRecurring,
  saveBudget,
  saveRecurring,
} from "./planning";
const card = (): Data => ({
  ...empty(),
  debts: [
    {
      id: "card",
      creditor: "Tarjeta ficticia",
      original: 0,
      initialBalance: 0,
      kind: "credit",
      charges: [],
      payments: [],
      due: "2026-12-05",
      cutDay: 31,
      paymentDay: 5,
    },
  ],
});
const purchase = (date = "2026-02-10", amount = 100): Movement => ({
  id: crypto.randomUUID(),
  type: "expense",
  date,
  merchant: "Tienda ficticia",
  category: "Compras",
  amount,
  method: "Tarjeta de crédito",
  notes: "Artículo para casa",
  creditDebtId: "card",
});
const rule = (patch: Partial<Recurring> = {}): Recurring => ({
  id: "rule",
  merchant: "Servicio ficticio",
  category: "Hogar",
  amount: 50,
  method: "Efectivo",
  nextDate: today(),
  frequency: "monthly",
  active: true,
  anchorDay: Number(today().slice(8)),
  ...patch,
});
describe("Edición y cortes", () => {
  it("edita metadatos conservando importes, cargos y pagos", () => {
    let d = saveMovement(card(), purchase());
    d = payDebt(d, "card", 40, "2026-03-01");
    const next = editDebt(d, "card", {
      creditor: "Nueva etiqueta",
      due: "2027-01-05",
      cutDay: 28,
      paymentDay: 6,
      notes: "Nota",
    });
    expect(next.debts[0]).toMatchObject({
      creditor: "Nueva etiqueta",
      cutDay: 28,
      paymentDay: 6,
      original: 0,
      initialBalance: 0,
    });
    expect(next.debts[0].charges).toEqual(d.debts[0].charges);
    expect(next.debts[0].payments).toEqual(d.debts[0].payments);
    expect(balance(next.debts[0])).toBe(60);
    expect(validateBackup(next)).toEqual(next);
  });
  it("rechaza corte incompleto o inválido y fechas inexistentes", () => {
    for (const patch of [
      { cutDay: 32, paymentDay: 5 },
      { cutDay: 20 },
      { cutDay: 1.5, paymentDay: 5 },
    ])
      expect(() =>
        editDebt(card(), "card", {
          creditor: "Tarjeta",
          due: "2026-12-05",
          ...patch,
        }),
      ).toThrow();
    expect(() =>
      editDebt(card(), "card", { creditor: "", due: "2026-12-05" }),
    ).toThrow();
  });
  it("calcula el último corte con meses cortos y aplica abonos a lo más antiguo", () => {
    let d = saveMovement(card(), purchase());
    d = saveMovement(d, purchase("2026-03-01", 50));
    d = payDebt(d, "card", 40, "2026-03-04");
    expect(cardCycle(d.debts[0], d, "2026-03-10")).toEqual({
      cut: "2026-02-28",
      due: "2026-03-05",
      amount: 60,
      nextDue: "2026-04-05",
    });
    expect(cardCycle(d.debts[0], d, "2026-03-31")).toEqual({
      cut: "2026-03-31",
      due: "2026-04-05",
      amount: 110,
      nextDue: "2026-05-05",
    });
  });
});
describe("Presupuestos por gastos pagados", () => {
  it("excluye compras TDC e ingresos e incluye el abono en su mes y categoría", () => {
    let d = saveMovement(card(), purchase());
    d = payDebt(d, "card", 40, "2026-03-04");
    d = saveMovement(d, {
      ...purchase("2026-03-05", 20),
      method: "Efectivo",
      creditDebtId: undefined,
      category: "Hogar",
    });
    d = saveMovement(d, {
      ...purchase("2026-03-05", 500),
      type: "income",
      creditDebtId: undefined,
    });
    expect(budgetSpent(d, { month: "2026-02", category: "", limit: 100 })).toBe(
      0,
    );
    expect(budgetSpent(d, { month: "2026-03", category: "", limit: 50 })).toBe(
      60,
    );
    expect(
      budgetSpent(d, {
        month: "2026-03",
        category: "Pago de deuda",
        limit: 100,
      }),
    ).toBe(40);
  });
  it("actualiza límites sin duplicarlos y valida importes", () => {
    let d = saveBudget(empty(), { month: "2026-11", category: "", limit: 100 });
    d = saveBudget(d, { month: "2026-11", category: "", limit: 200 });
    expect(d.budgets).toHaveLength(1);
    expect(d.budgets![0].limit).toBe(200);
    expect(() =>
      saveBudget(d, { month: "2026-13", category: "", limit: 1 }),
    ).toThrow();
    expect(() =>
      saveBudget(d, { month: "2026-11", category: "", limit: 0 }),
    ).toThrow();
  });
});
describe("Recurrentes confirmados", () => {
  it("conserva el día 31 y los años bisiestos al avanzar", () => {
    const jan = rule({ nextDate: "2026-01-31", anchorDay: 31 });
    expect(nextOccurrence(jan)).toBe("2026-02-28");
    expect(nextOccurrence({ ...jan, nextDate: "2026-02-28" })).toBe(
      "2026-03-31",
    );
    expect(
      nextOccurrence(
        rule({ nextDate: "2024-02-29", anchorDay: 29, frequency: "yearly" }),
      ),
    ).toBe("2025-02-28");
    expect(
      nextOccurrence(rule({ nextDate: "2026-12-30", frequency: "weekly" })),
    ).toBe("2027-01-06");
  });
  it("guardar una programación no crea un gasto y confirmar solo crea uno", () => {
    const d = saveRecurring(empty(), rule());
    expect(d.movements).toHaveLength(0);
    const next = registerRecurring(d, "rule", today());
    expect(next.movements).toHaveLength(1);
    expect(next.movements[0]).toMatchObject({
      recurringId: "rule",
      recurringDate: today(),
      amount: 50,
    });
    expect(() => registerRecurring(next, "rule", today())).toThrow();
    expect(() => saveRecurring(next, rule())).toThrow("ya fue registrado");
    expect(validateBackup(next)).toEqual(next);
  });
  it("impide confirmar reglas pausadas, futuras o eliminadas", () => {
    for (const r of [
      rule({ active: false }),
      rule({ nextDate: "2099-01-01" }),
    ]) {
      const d = saveRecurring(empty(), r);
      expect(() => registerRecurring(d, "rule", r.nextDate)).toThrow();
    }
    expect(() => registerRecurring(empty(), "missing", today())).toThrow();
  });
  it("una programación de TDC solo crea deuda y respeta los metadatos al editar", () => {
    const d = saveRecurring(
      card(),
      rule({ method: "Tarjeta de crédito", creditDebtId: "card" }),
    );
    const next = registerRecurring(d, "rule", today());
    expect(balance(next.debts[0])).toBe(50);
    const movement = next.movements[0];
    const edited = saveMovement(next, {
      ...movement,
      notes: "Corrección",
      recurringId: undefined,
      recurringDate: undefined,
    });
    expect(edited.movements[0].recurringDate).toBe(today());
    expect(validateBackup(edited)).toEqual(edited);
  });
  it("dos confirmaciones concurrentes del mismo vencimiento solo guardan una", async () => {
    await changeData(() => saveRecurring(empty(), rule()));
    const results = await Promise.allSettled([
      changeData((d) => registerRecurring(d, "rule", today())),
      changeData((d) => registerRecurring(d, "rule", today())),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect((await readData()).movements).toHaveLength(1);
  });
});
describe("Búsqueda, respaldos y recordatorios", () => {
  it("busca sin distinguir acentos y por notas o importe formateado", () => {
    const m = purchase();
    expect(matchesSearch(m, "articulo")).toBe(true);
    expect(matchesSearch(m, "$100.00")).toBe(true);
    expect(matchesSearch(m, "TIENDA")).toBe(true);
    expect(matchesSearch(m, "999")).toBe(false);
    let d = saveMovement(card(), m);
    d = payDebt(d, "card", 20, today());
    expect(movementDebtId(d, d.movements[1])).toBe("card");
  });
  it("detecta siete días y conserva todas las mejoras en JSON", () => {
    const now = Date.parse("2026-11-11T12:00:00Z");
    expect(backupOverdue(undefined, now)).toBe(true);
    expect(backupOverdue("2026-11-04T12:00:00Z", now)).toBe(true);
    expect(backupOverdue("2026-11-05T12:00:00Z", now)).toBe(false);
    const d = {
      ...saveBudget(saveRecurring(card(), rule()), {
        month: "2026-11",
        category: "",
        limit: 100,
      }),
      lastBackupAt: "2026-11-11T12:00:00Z",
    };
    expect(validateBackup(JSON.parse(JSON.stringify(d)))).toEqual(d);
    expect(() =>
      validateBackup({ ...d, budgets: [...d.budgets!, ...d.budgets!] }),
    ).toThrow();
    expect(() =>
      validateBackup({ ...d, recurrents: [{ ...rule(), anchorDay: 32 }] }),
    ).toThrow();
    expect(() => validateBackup({ ...d, lastBackupAt: "invalid" })).toThrow();
  });
});
