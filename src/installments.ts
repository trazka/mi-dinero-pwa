import type { Movement, Debt } from "./data";
export type Msi = { months: number; firstCut: string };
export function validMsi(m: {
  msi?: Msi;
  type: string;
  method: string;
  creditDebtId?: string;
  amount: number;
  date: string;
}) {
  if (m.msi === undefined) return true;
  const plan = m.msi;
  return (
    !!plan &&
    m.type === "expense" &&
    m.method === "Tarjeta de crédito" &&
    !!m.creditDebtId &&
    Number.isInteger(plan.months) &&
    plan.months >= 2 &&
    plan.months <= 60 &&
    Math.round(m.amount * 100) >= plan.months &&
    typeof plan.firstCut === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(plan.firstCut) &&
    !Number.isNaN(Date.parse(plan.firstCut)) &&
    new Date(plan.firstCut + "T12:00:00Z").toISOString().slice(0, 10) ===
      plan.firstCut &&
    plan.firstCut >= m.date
  );
}
function dateInMonth(month: string, day: number) {
  const [y, m] = month.split("-").map(Number);
  return `${month}-${String(Math.min(day, new Date(Date.UTC(y, m, 0)).getUTCDate())).padStart(2, "0")}`;
}
function nextMonth(month: string, offset: number) {
  const d = new Date(month + "-01T12:00:00Z");
  d.setUTCMonth(d.getUTCMonth() + offset);
  return d.toISOString().slice(0, 7);
}
export function suggestedCut(date: string, debt?: Debt) {
  if (!debt?.cutDay || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return "";
  let month = date.slice(0, 7),
    cut = dateInMonth(month, debt.cutDay);
  if (cut < date) cut = dateInMonth(nextMonth(month, 1), debt.cutDay);
  return cut;
}
export function installmentSchedule(
  m: Pick<Movement, "msi" | "amount">,
  debt?: Debt,
) {
  if (!m.msi) return [];
  const total = Math.round(m.amount * 100),
    base = Math.floor(total / m.msi.months);
  const day = debt?.cutDay ?? Number(m.msi.firstCut.slice(8));
  return Array.from({ length: m.msi.months }, (_, i) => {
    const cut =
      i === 0
        ? m.msi!.firstCut
        : dateInMonth(nextMonth(m.msi!.firstCut.slice(0, 7), i), day);
    let due = debt?.paymentDay
      ? dateInMonth(cut.slice(0, 7), debt.paymentDay)
      : undefined;
    if (due && due <= cut)
      due = dateInMonth(nextMonth(cut.slice(0, 7), 1), debt!.paymentDay!);
    return {
      number: i + 1,
      cut,
      due,
      amount: (i === m.msi!.months - 1 ? total - base * i : base) / 100,
    };
  });
}
export function billableAtCut(m: Movement, cut: string, debt: Debt) {
  if (!m.msi) return m.date <= cut ? m.amount : 0;
  return (
    installmentSchedule(m, debt)
      .filter((p) => p.cut <= cut)
      .reduce((s, p) => s + Math.round(p.amount * 100), 0) / 100
  );
}

export function effectiveFirstCut(firstCut: string, date: string, debt?: Debt) {
  if (firstCut >= date) return firstCut;
  const suggestion = suggestedCut(date, debt);
  if (suggestion) return suggestion;
  let month = date.slice(0, 7),
    cut = dateInMonth(month, Number(firstCut.slice(8)));
  if (cut < date)
    cut = dateInMonth(nextMonth(month, 1), Number(firstCut.slice(8)));
  return cut;
}
