import {
  balance,
  cents,
  saveMovement,
  today,
  validDate,
  type Budget,
  type Data,
  type Debt,
  type Movement,
  type Recurring,
} from "./data";
const monthDay = (year: number, month: number, day: number) => {
  const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return `${String(year).padStart(4, "0")}-${String(month + 1).padStart(2, "0")}-${String(Math.min(day, last)).padStart(2, "0")}`;
};
export function shiftMonth(month: string, delta: number) {
  const d = new Date(month + "-01T12:00:00Z");
  d.setUTCMonth(d.getUTCMonth() + delta);
  return d.toISOString().slice(0, 7);
}
export function editDebt(
  data: Data,
  id: string,
  patch: Pick<Debt, "creditor" | "due" | "cutDay" | "paymentDay" | "notes">,
): Data {
  if (
    !data.debts.some((d) => d.id === id) ||
    !patch.creditor.trim() ||
    patch.creditor.length > 120 ||
    !validDate(patch.due) ||
    (patch.notes?.length ?? 0) > 2000
  )
    throw Error("Revisa el nombre y el vencimiento de la deuda.");
  if (
    (patch.cutDay === undefined) !== (patch.paymentDay === undefined) ||
    [patch.cutDay, patch.paymentDay].some(
      (day) =>
        day !== undefined && (!Number.isInteger(day) || day < 1 || day > 31),
    )
  )
    throw Error(
      "Indica tanto el día de corte como el día límite, entre 1 y 31, o deja ambos vacíos.",
    );
  return {
    ...data,
    debts: data.debts.map((d) =>
      d.id === id ? { ...d, ...patch, creditor: patch.creditor.trim() } : d,
    ),
  };
}
export function cardCycle(debt: Debt, data: Data, date = today()) {
  if (debt.kind !== "credit" || !debt.cutDay || !debt.paymentDay) return null;
  const year = Number(date.slice(0, 4)),
    month = Number(date.slice(5, 7)) - 1;
  let cut = monthDay(year, month, debt.cutDay);
  if (cut > date) {
    const prev = shiftMonth(date.slice(0, 7), -1);
    cut = monthDay(
      Number(prev.slice(0, 4)),
      Number(prev.slice(5)) - 1,
      debt.cutDay,
    );
  }
  let due = monthDay(
    Number(cut.slice(0, 4)),
    Number(cut.slice(5, 7)) - 1,
    debt.paymentDay,
  );
  if (due <= cut) {
    const next = shiftMonth(cut.slice(0, 7), 1);
    due = monthDay(
      Number(next.slice(0, 4)),
      Number(next.slice(5)) - 1,
      debt.paymentDay,
    );
  }
  const amount = Math.max(
    0,
    (Math.round(debt.initialBalance * 100) +
      (debt.charges ?? []).reduce(
        (sum, c) =>
          sum +
          ((data.movements.find((m) => m.id === c.movementId)?.date ??
            "9999-12-31") <= cut
            ? Math.round(c.amount * 100)
            : 0),
        0,
      ) -
      debt.payments
        .filter((p) => p.date <= date)
        .reduce((sum, p) => sum + Math.round(p.amount * 100), 0)) /
      100,
  );
  const nextMonth = shiftMonth(cut.slice(0, 7), 1);
  const nextCut = monthDay(
    Number(nextMonth.slice(0, 4)),
    Number(nextMonth.slice(5)) - 1,
    debt.cutDay,
  );
  let nextDue = monthDay(
    Number(nextCut.slice(0, 4)),
    Number(nextCut.slice(5, 7)) - 1,
    debt.paymentDay,
  );
  if (nextDue <= nextCut) {
    const monthAfter = shiftMonth(nextCut.slice(0, 7), 1);
    nextDue = monthDay(
      Number(monthAfter.slice(0, 4)),
      Number(monthAfter.slice(5)) - 1,
      debt.paymentDay,
    );
  }
  return { cut, due, amount: Math.min(balance(debt), amount), nextDue };
}
export function saveBudget(data: Data, budget: Budget): Data {
  if (
    !/^\d{4}-(0[1-9]|1[0-2])$/.test(budget.month) ||
    !cents(budget.limit) ||
    typeof budget.category !== "string" ||
    budget.category.length > 2000
  )
    throw Error("Revisa el mes y el límite del presupuesto.");
  return {
    ...data,
    budgets: [
      ...(data.budgets ?? []).filter(
        (b) => b.month !== budget.month || b.category !== budget.category,
      ),
      budget,
    ],
  };
}
export function budgetSpent(data: Data, budget: Budget) {
  return (
    data.movements
      .filter(
        (m) =>
          m.type === "expense" &&
          !m.creditPaymentDebtId &&
          !(
            m.paymentId &&
            data.debts.some(
              (d) =>
                d.kind === "credit" &&
                d.payments.some((p) => p.movementId === m.id),
            )
          ) &&
          m.date.startsWith(budget.month) &&
          (!budget.category || m.category === budget.category),
      )
      .reduce((sum, m) => sum + Math.round(m.amount * 100), 0) / 100
  );
}
export function nextOccurrence(r: Recurring) {
  const d = new Date(r.nextDate + "T12:00:00Z");
  if (r.frequency === "weekly") {
    d.setUTCDate(d.getUTCDate() + 7);
    return d.toISOString().slice(0, 10);
  }
  if (r.frequency === "monthly") {
    const next = shiftMonth(r.nextDate.slice(0, 7), 1);
    return monthDay(
      Number(next.slice(0, 4)),
      Number(next.slice(5)) - 1,
      r.anchorDay,
    );
  }
  return monthDay(d.getUTCFullYear() + 1, d.getUTCMonth(), r.anchorDay);
}
export function saveRecurring(data: Data, r: Recurring): Data {
  if (
    !r.merchant.trim() ||
    r.merchant.length > 120 ||
    typeof r.category !== "string" ||
    r.category.length > 2000 ||
    typeof r.method !== "string" ||
    typeof r.active !== "boolean" ||
    !cents(r.amount) ||
    !validDate(r.nextDate) ||
    !["weekly", "monthly", "yearly"].includes(r.frequency) ||
    !Number.isInteger(r.anchorDay) ||
    r.anchorDay < 1 ||
    r.anchorDay > 31
  )
    throw Error("Revisa los datos del gasto recurrente.");
  if (
    r.method === "Tarjeta de crédito" &&
    !data.debts.some((d) => d.id === r.creditDebtId)
  )
    throw Error("Selecciona una tarjeta para el gasto recurrente.");
  if (r.creditDebtId && r.method !== "Tarjeta de crédito")
    throw Error("El vínculo de tarjeta solo corresponde a compras con TDC.");
  if (
    data.movements.some(
      (m) => m.recurringId === r.id && m.recurringDate === r.nextDate,
    )
  )
    throw Error(
      "Ese vencimiento ya fue registrado. Elige la próxima fecha pendiente.",
    );
  return {
    ...data,
    recurrents: [
      ...(data.recurrents ?? []).filter((old) => old.id !== r.id),
      r,
    ],
  };
}
export function registerRecurring(
  data: Data,
  id: string,
  expectedDate: string,
): Data {
  const r = data.recurrents?.find((r) => r.id === id);
  if (
    !r ||
    !r.active ||
    r.nextDate !== expectedDate ||
    r.nextDate > today() ||
    data.movements.some(
      (m) => m.recurringId === id && m.recurringDate === expectedDate,
    )
  )
    throw Error(
      "Este vencimiento ya se registró, está pausado o todavía no vence.",
    );
  const movement: Movement = {
    id: crypto.randomUUID(),
    type: "expense",
    date: r.nextDate,
    merchant: r.merchant,
    category: r.category,
    amount: r.amount,
    method: r.method,
    notes: "Gasto recurrente confirmado",
    recurringId: r.id,
    recurringDate: r.nextDate,
    ...(r.method === "Tarjeta de crédito"
      ? { creditDebtId: r.creditDebtId }
      : {}),
  };
  const next = saveMovement(data, movement);
  return {
    ...next,
    recurrents: next.recurrents?.map((item) =>
      item.id === id ? { ...item, nextDate: nextOccurrence(r) } : item,
    ),
  };
}
export const backupOverdue = (last?: string, now = Date.now()) =>
  !last || now - Date.parse(last) >= 7 * 86400000;
export function matchesSearch(m: Movement, query: string) {
  const q = query
    .trim()
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  if (!q) return true;
  const number = q.replace(/[$,\s]/g, "");
  if (
    /^-?\d+(\.\d{1,2})?$/.test(number) &&
    Math.round(Math.abs(Number(number)) * 100) === Math.round(m.amount * 100)
  )
    return true;
  return [m.merchant, m.notes, m.category].some((text) =>
    text
      .toLocaleLowerCase()
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .includes(q),
  );
}
export function movementDebtId(data: Data, m: Movement) {
  return (
    m.creditDebtId ??
    m.creditPaymentDebtId ??
    data.debts.find((d) => d.payments.some((p) => p.movementId === m.id))?.id
  );
}
