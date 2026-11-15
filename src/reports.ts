import { expenseAmount, type Movement, type Saving } from "./data";

export type ReportGroup = {
  income: number;
  expense: number;
  acquired: number;
  reserved: number;
};
export function groupReport(
  movements: Movement[],
  savings: Saving[],
  period: string,
  from = "",
  to = "",
) {
  const groups = new Map<string, ReportGroup>();
  function group(date: string) {
    let key = date;
    if (period === "monthly") key = date.slice(0, 7);
    if (period === "weekly") {
      const d = new Date(date + "T12:00:00Z");
      d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
      key = d.toISOString().slice(0, 10);
    }
    if (!groups.has(key))
      groups.set(key, { income: 0, expense: 0, acquired: 0, reserved: 0 });
    return groups.get(key)!;
  }
  for (const m of movements) {
    if (m.type === "transfer") continue;
    const g = group(m.date);
    g.acquired += m.creditDebtId ? m.amount : 0;
    g[m.type === "income" ? "income" : "expense"] +=
      m.type === "income" ? m.amount : expenseAmount(m);
  }
  for (const saving of savings)
    for (const entry of saving.entries) {
      if ((from && entry.date < from) || (to && entry.date > to)) continue;
      const g = group(entry.date);
      g.reserved =
        (Math.round(g.reserved * 100) +
          (entry.type === "deposit" ? 1 : -1) *
            Math.round(entry.amount * 100)) /
        100;
    }
  return groups;
}
export const reportFree = (g: ReportGroup) =>
  (Math.round(g.income * 100) -
    Math.round(g.expense * 100) -
    Math.round(g.reserved * 100)) /
  100;

export const reportUsed = (g: ReportGroup) =>
  (Math.round(g.expense * 100) + Math.round(g.reserved * 100)) / 100;
