import { openDB } from "idb";
export type Movement = {
  id: string;
  type: "income" | "expense";
  date: string;
  merchant: string;
  category: string;
  amount: number;
  method: string;
  notes: string;
  paymentId?: string;
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
};
export type Data = { version: 1; movements: Movement[]; debts: Debt[] };
export const empty = (): Data => ({ version: 1, movements: [], debts: [] });
export const money = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(
    n,
  );
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const balance = (d: Debt) =>
  (Math.round(d.initialBalance * 100) -
    d.payments.reduce((s, p) => s + Math.round(p.amount * 100), 0)) /
  100;
export const cents = (v: number) =>
  Number.isFinite(v) &&
  v > 0 &&
  v <= 999999999 &&
  Math.abs(v * 100 - Math.round(v * 100)) < 0.0001;
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
      },
    ],
  };
}
export function removeMovement(data: Data, id: string): Data {
  return {
    ...data,
    movements: data.movements.filter((m) => m.id !== id),
    debts: data.debts.map((d) => ({
      ...d,
      payments: d.payments.filter((p) => p.movementId !== id),
    })),
  };
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
  if (d.version !== 1 || !Array.isArray(d.movements) || !Array.isArray(d.debts))
    return fail();
  const ids = new Set<string>();
  const unique = (id: unknown) => {
    if (!str(id) || !id || ids.has(id)) fail();
    ids.add(id as string);
  };
  for (const m of d.movements) {
    if (
      !m ||
      !["income", "expense"].includes(m.type) ||
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
      !cents(debt.original) ||
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
        links.has(m.id)
      )
        return fail();
      links.add(m.id);
    }
    if (balance(debt) < 0) return fail();
  }
  for (const m of d.movements)
    if (m.paymentId && !links.has(m.id)) return fail();
  return structuredClone(d);
}
const db = () =>
  openDB("mi-dinero", 1, {
    upgrade(db) {
      db.createObjectStore("data");
    },
  });
export async function readData(): Promise<Data> {
  const database = await db();
  return (await database.get("data", "main")) ?? empty();
}
export async function changeData(fn: (data: Data) => Data): Promise<Data> {
  const database = await db();
  const tx = database.transaction("data", "readwrite");
  const current = (await tx.store.get("main")) ?? empty();
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
      ],
      ...movements.map((m) => [
        m.date,
        m.type === "income" ? "Ingreso" : "Gasto",
        m.merchant,
        m.category,
        m.amount.toFixed(2),
        m.method,
        m.notes,
      ]),
    ]
      .map((r) => r.map(cell).join(","))
      .join("\r\n")
  );
}
