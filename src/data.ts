import { openDB } from "idb";
export type Movement = {
  id: string;
  type: "income" | "expense" | "transfer";
  date: string;
  merchant: string;
  category: string;
  amount: number;
  method: string;
  notes: string;
  transferDirection?: "bank-to-cash" | "cash-to-bank";
  paymentId?: string;
  creditDebtId?: string;
  creditPaymentDebtId?: string;
  recurringId?: string;
  recurringDate?: string;
};
export type Payment = {
  id: string;
  amount: number;
  date: string;
  movementId: string;
};
export type Debt = {
  id: string;
  creditor: string;
  original: number;
  initialBalance: number;
  due: string;
  payments: Payment[];
  kind?: "credit";
  cutDay?: number;
  paymentDay?: number;
  notes?: string;
  charges?: { movementId: string; amount: number }[];
};
export type Budget = { month: string; category: string; limit: number };
export type Recurring = {
  id: string;
  merchant: string;
  category: string;
  amount: number;
  method: string;
  nextDate: string;
  frequency: "weekly" | "monthly" | "yearly";
  active: boolean;
  anchorDay: number;
  creditDebtId?: string;
};
export type Saving = {
  id: string;
  name: string;
  target: number;
  entries: {
    id: string;
    type: "deposit" | "withdrawal";
    amount: number;
    date: string;
  }[];
};
export type Data = {
  version: 2;
  movements: Movement[];
  debts: Debt[];
  savings?: Saving[];
  budgets?: Budget[];
  recurrents?: Recurring[];
  lastBackupAt?: string;
};
export const empty = (): Data => ({ version: 2, movements: [], debts: [] });
export const money = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(
    n,
  );
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const balance = (d: Debt) =>
  (Math.round(d.initialBalance * 100) +
    (d.charges ?? []).reduce((s, c) => s + Math.round(c.amount * 100), 0) -
    d.payments.reduce((s, p) => s + Math.round(p.amount * 100), 0)) /
  100;
export const cents = (v: number) =>
  Number.isFinite(v) &&
  v > 0 &&
  v <= 999999999 &&
  Math.abs(v * 100 - Math.round(v * 100)) < 0.0001;
export const expenseAmount = (m: Movement) =>
  m.type === "expense" && !m.creditDebtId ? m.amount : 0;

export function walletBalances(data: Data) {
  const totals = { bank: 0, cash: 0, unassigned: 0 };
  for (const movement of data.movements) {
    const amount = Math.round(movement.amount * 100);
    if (movement.type === "transfer") {
      const sign = movement.transferDirection === "bank-to-cash" ? 1 : -1;
      totals.bank -= sign * amount;
      totals.cash += sign * amount;
      continue;
    }
    const value =
      movement.type === "income"
        ? amount
        : -Math.round(expenseAmount(movement) * 100);
    const method = movement.method.trim().toLocaleLowerCase("es");
    const wallet =
      method === "efectivo"
        ? "cash"
        : ["transferencia", "tarjeta de débito"].includes(method)
          ? "bank"
          : "unassigned";
    totals[wallet] += value;
  }
  return {
    bank: totals.bank / 100,
    cash: totals.cash / 100,
    unassigned: totals.unassigned / 100,
  };
}
export const transferRoute = (m: Movement) =>
  m.transferDirection === "bank-to-cash"
    ? { from: "Banco", to: "Efectivo", label: "Retiro a efectivo" }
    : { from: "Efectivo", to: "Banco", label: "Depósito al banco" };
function validTransfer(m: Movement) {
  return m.type === "transfer"
    ? ["bank-to-cash", "cash-to-bank"].includes(m.transferDirection ?? "") &&
        !m.paymentId &&
        !m.creditDebtId &&
        !m.creditPaymentDebtId &&
        !m.recurringId &&
        !m.recurringDate
    : m.transferDirection === undefined;
}

export function payDebt(
  data: Data,
  id: string,
  amount: number,
  date: string,
): Data {
  const debt = data.debts.find((d) => d.id === id);
  if (!debt || !cents(amount) || amount > balance(debt) || !validDate(date))
    throw Error(
      "Revisa el importe: debe ser mayor a cero y no superar el saldo pendiente.",
    );
  const paymentId = crypto.randomUUID(),
    movementId = crypto.randomUUID();
  return {
    ...data,
    debts: data.debts.map((d) =>
      d.id === id
        ? {
            ...d,
            payments: [
              ...d.payments,
              { id: paymentId, amount, date, movementId },
            ],
          }
        : d,
    ),
    movements: [
      ...data.movements,
      {
        id: movementId,
        type: "expense",
        date,
        merchant: debt.creditor,
        category: "Pago de deuda",
        amount,
        method: "Transferencia",
        notes: "Abono vinculado a deuda",
        paymentId,
        ...(debt.kind === "credit" ? { creditPaymentDebtId: debt.id } : {}),
      },
    ],
  };
}
function assertBalances(data: Data): Data {
  if (data.debts.some((d) => balance(d) < 0))
    throw Error(
      "Primero revierte los abonos de esta deuda antes de reducir o eliminar la compra.",
    );
  return data;
}
export function saveMovement(data: Data, movement: Movement): Data {
  const old = data.movements.find((m) => m.id === movement.id);
  if (old?.paymentId || movement.paymentId || movement.creditPaymentDebtId)
    throw Error("Los abonos se corrigen desde su deuda.");
  if (
    !cents(movement.amount) ||
    !validDate(movement.date) ||
    !["income", "expense", "transfer"].includes(movement.type)
  )
    throw Error("Revisa los datos del movimiento.");
  if (
    !validTransfer(movement) ||
    (movement.type === "transfer" && old?.recurringId)
  )
    throw Error(
      "Revisa el origen y destino del traspaso. No puede vincularse a una deuda o recurrente.",
    );
  if (movement.type === "transfer") {
    const available = walletBalances({
      ...data,
      movements: data.movements.filter((m) => m.id !== movement.id),
    });
    const source =
      movement.transferDirection === "bank-to-cash"
        ? available.bank
        : available.cash;
    if (Math.round(movement.amount * 100) > Math.round(source * 100))
      throw Error(
        "El importe supera el saldo de origen. Revisa los métodos registrados o agrega los movimientos anteriores que falten.",
      );
  }
  const linked =
    movement.type === "expense" && movement.method === "Tarjeta de crédito";
  const legacyUnlinked =
    old?.type === "expense" &&
    old.method === "Tarjeta de crédito" &&
    !old.creditDebtId;
  if (
    linked &&
    !(legacyUnlinked && !movement.creditDebtId) &&
    !data.debts.some((d) => d.id === movement.creditDebtId)
  )
    throw Error(
      "Selecciona la deuda o tarjeta a la que corresponde la compra.",
    );
  const m = { ...movement };
  if (old?.recurringId) {
    m.recurringId = old.recurringId;
    m.recurringDate = old.recurringDate;
  }
  if (!linked || !m.creditDebtId) delete m.creditDebtId;
  const next: Data = {
    ...data,
    movements: old
      ? data.movements.map((item) => (item.id === m.id ? m : item))
      : [...data.movements, m],
    debts: data.debts.map((d) => {
      const charges = (d.charges ?? []).filter((c) => c.movementId !== m.id);
      if (m.creditDebtId === d.id)
        return {
          ...d,
          kind: "credit",
          charges: [...charges, { movementId: m.id, amount: m.amount }],
        };
      return d.charges ? { ...d, charges } : d;
    }),
  };
  return assertBalances(next);
}
export function removeMovement(data: Data, id: string): Data {
  return assertBalances({
    ...data,
    movements: data.movements.filter((m) => m.id !== id),
    debts: data.debts.map((d) => ({
      ...d,
      payments: d.payments.filter((p) => p.movementId !== id),
      ...(d.charges
        ? { charges: d.charges.filter((c) => c.movementId !== id) }
        : {}),
    })),
  });
}
export function validDate(v: unknown): v is string {
  return (
    typeof v === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(v) &&
    !Number.isNaN(Date.parse(v)) &&
    new Date(v + "T12:00:00Z").toISOString().slice(0, 10) === v
  );
}
const str = (v: unknown): v is string =>
  typeof v === "string" && v.length <= 2000;
export function validateBackup(input: unknown): Data {
  const fail = () => {
    throw Error(
      "El respaldo no es válido o tiene vínculos de deuda inconsistentes.",
    );
  };
  if (!input || typeof input !== "object") return fail();
  const d = input as Data;
  if (
    ![1, 2].includes((d as { version: number }).version) ||
    !Array.isArray(d.movements) ||
    !Array.isArray(d.debts)
  )
    return fail();
  const ids = new Set<string>();
  const unique = (id: unknown) => {
    if (!str(id) || !id || ids.has(id)) fail();
    ids.add(id as string);
  };
  for (const m of d.movements) {
    if (
      !m ||
      !["income", "expense", "transfer"].includes(m.type) ||
      !validTransfer(m) ||
      !validDate(m.date) ||
      !cents(m.amount) ||
      ![m.merchant, m.category, m.method, m.notes].every(str)
    )
      return fail();
    unique(m.id);
    if (m.paymentId !== undefined && !str(m.paymentId)) return fail();
  }
  const links = new Set<string>();
  for (const debt of d.debts) {
    if (
      !debt ||
      !str(debt.creditor) ||
      !(
        cents(debt.original) ||
        (debt.kind === "credit" && debt.original === 0)
      ) ||
      !Number.isFinite(debt.initialBalance) ||
      debt.initialBalance < 0 ||
      debt.initialBalance > debt.original ||
      Math.abs(
        debt.initialBalance * 100 - Math.round(debt.initialBalance * 100),
      ) > 0.0001 ||
      !validDate(debt.due) ||
      !Array.isArray(debt.payments)
    )
      return fail();
    unique(debt.id);
    if (debt.notes !== undefined && !str(debt.notes)) return fail();
    if (
      [debt.cutDay, debt.paymentDay].some(
        (day) =>
          day !== undefined && (!Number.isInteger(day) || day < 1 || day > 31),
      )
    )
      return fail();
    if ((debt.cutDay === undefined) !== (debt.paymentDay === undefined))
      return fail();
    if (debt.kind !== undefined && debt.kind !== "credit") return fail();
    if (
      debt.charges !== undefined &&
      (!Array.isArray(debt.charges) || debt.kind !== "credit")
    )
      return fail();
    const charges = new Set<string>();
    for (const c of debt.charges ?? []) {
      const m = d.movements.find((m) => m.id === c?.movementId);
      if (
        !c ||
        !cents(c.amount) ||
        !m ||
        m.creditDebtId !== debt.id ||
        m.type !== "expense" ||
        m.method !== "Tarjeta de crédito" ||
        m.paymentId ||
        m.amount !== c.amount ||
        charges.has(m.id)
      )
        return fail();
      charges.add(m.id);
    }
    for (const p of debt.payments) {
      if (!p || !cents(p.amount) || !validDate(p.date)) return fail();
      unique(p.id);
      const m = d.movements.find((m) => m.id === p.movementId);
      if (
        !m ||
        m.paymentId !== p.id ||
        m.type !== "expense" ||
        m.amount !== p.amount ||
        m.date !== p.date ||
        links.has(m.id) ||
        (m.creditPaymentDebtId !== undefined &&
          (m.creditPaymentDebtId !== debt.id || debt.kind !== "credit"))
      )
        return fail();
      links.add(m.id);
    }
    if (balance(debt) < 0) return fail();
  }
  for (const m of d.movements) {
    if (m.paymentId && !links.has(m.id)) return fail();
    if (
      m.creditPaymentDebtId !== undefined &&
      (!m.paymentId || !str(m.creditPaymentDebtId))
    )
      return fail();
    if (m.creditDebtId !== undefined) {
      const debt = d.debts.find((debt) => debt.id === m.creditDebtId);
      if (
        !debt ||
        debt.kind !== "credit" ||
        !(debt.charges ?? []).some((c) => c.movementId === m.id) ||
        m.creditPaymentDebtId
      )
        return fail();
    }
  }
  const occurrences = new Set<string>();
  for (const m of d.movements) {
    if ((m.recurringId === undefined) !== (m.recurringDate === undefined))
      return fail();
    if (m.recurringId !== undefined) {
      const key = m.recurringId + ":" + m.recurringDate;
      if (
        !str(m.recurringId) ||
        !m.recurringId ||
        !validDate(m.recurringDate) ||
        occurrences.has(key)
      )
        return fail();
      occurrences.add(key);
    }
  }
  if (d.savings !== undefined && !Array.isArray(d.savings)) return fail();
  for (const saving of d.savings ?? []) {
    if (
      !saving ||
      !str(saving.name) ||
      !saving.name.trim() ||
      saving.name.length > 120 ||
      !cents(saving.target) ||
      !Array.isArray(saving.entries)
    )
      return fail();
    unique(saving.id);
    let saved = 0;
    for (const entry of saving.entries) {
      if (
        !entry ||
        !["deposit", "withdrawal"].includes(entry.type) ||
        !cents(entry.amount) ||
        !validDate(entry.date)
      )
        return fail();
      unique(entry.id);
      saved +=
        (entry.type === "deposit" ? 1 : -1) * Math.round(entry.amount * 100);
      if (saved < 0 || !Number.isSafeInteger(saved)) return fail();
    }
  }
  if (d.budgets !== undefined && !Array.isArray(d.budgets)) return fail();
  const budgetKeys = new Set<string>();
  for (const b of d.budgets ?? []) {
    if (
      !b ||
      typeof b.month !== "string" ||
      !/^\d{4}-(0[1-9]|1[0-2])$/.test(b.month) ||
      !str(b.category) ||
      !cents(b.limit)
    )
      return fail();
    const key = b.month + ":" + b.category;
    if (budgetKeys.has(key)) return fail();
    budgetKeys.add(key);
  }
  if (d.recurrents !== undefined && !Array.isArray(d.recurrents)) return fail();
  for (const r of d.recurrents ?? []) {
    if (
      !r ||
      !str(r.merchant) ||
      !r.merchant.trim() ||
      !str(r.category) ||
      !str(r.method) ||
      !cents(r.amount) ||
      !validDate(r.nextDate) ||
      !["weekly", "monthly", "yearly"].includes(r.frequency) ||
      typeof r.active !== "boolean" ||
      !Number.isInteger(r.anchorDay) ||
      r.anchorDay < 1 ||
      r.anchorDay > 31
    )
      return fail();
    unique(r.id);
    if (
      r.method === "Tarjeta de crédito" &&
      !d.debts.some((debt) => debt.id === r.creditDebtId)
    )
      return fail();
    if (
      r.creditDebtId !== undefined &&
      (!str(r.creditDebtId) || r.method !== "Tarjeta de crédito")
    )
      return fail();
  }
  if (
    d.lastBackupAt !== undefined &&
    (typeof d.lastBackupAt !== "string" ||
      !Number.isFinite(Date.parse(d.lastBackupAt)))
  )
    return fail();
  return { ...structuredClone(d), version: 2 };
}
const db = () =>
  openDB("mi-dinero", 1, {
    upgrade(db) {
      db.createObjectStore("data");
    },
  });
export async function readData(): Promise<Data> {
  const database = await db();
  const stored = (await database.get("data", "main")) ?? empty();
  if (![1, 2].includes(stored.version))
    throw Error(
      "La versión de los datos no es compatible con esta aplicación.",
    );
  return { ...stored, version: 2 };
}
export async function changeData(fn: (data: Data) => Data): Promise<Data> {
  const database = await db();
  const tx = database.transaction("data", "readwrite");
  const stored = (await tx.store.get("main")) ?? empty();
  const current: Data = { ...stored, version: 2 };
  let next: Data;
  try {
    next = fn(current);
    await tx.store.put(next, "main");
    await tx.done;
    return next;
  } catch (e) {
    try {
      tx.abort();
    } catch {
      /* Transaction may already be closed. */
    }
    await tx.done.catch(() => {});
    throw e;
  }
}
export function csv(movements: Movement[]) {
  const cell = (s: unknown) =>
    '"' +
    String(s)
      .replace(/^(?:\s*[=+@-]|[\t\r])/, "'$&")
      .replaceAll('"', '""') +
    '"';
  return (
    "\uFEFF" +
    [
      [
        "Fecha",
        "Tipo",
        "Establecimiento",
        "Categoría",
        "Importe MXN",
        "Método de pago",
        "Notas",
        "ID deuda de compra",
        "ID deuda de abono",
        "Gasto contabilizado MXN",
        "Origen del traspaso",
        "Destino del traspaso",
      ],
      ...movements.map((m) => [
        m.date,
        m.type === "transfer"
          ? "Traspaso"
          : m.creditPaymentDebtId
            ? "Abono de tarjeta"
            : m.creditDebtId
              ? "Compra con tarjeta (a deuda)"
              : m.type === "income"
                ? "Ingreso"
                : "Gasto",
        m.merchant,
        m.category,
        m.amount.toFixed(2),
        m.method,
        m.notes,
        m.creditDebtId ?? "",
        m.creditPaymentDebtId ?? "",
        expenseAmount(m).toFixed(2),
        m.type === "transfer" ? transferRoute(m).from : "",
        m.type === "transfer" ? transferRoute(m).to : "",
      ]),
    ]
      .map((r) => r.map(cell).join(","))
      .join("\r\n")
  );
}
