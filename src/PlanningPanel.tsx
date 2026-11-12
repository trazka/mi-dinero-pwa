import { useEffect, useId, useState, type FormEvent } from "react";
import DatePicker from "./DatePicker";
import { money, today, type Data, type Recurring } from "./data";
import {
  budgetSpent,
  registerRecurring,
  saveBudget,
  saveRecurring,
  shiftMonth,
} from "./planning";
export type Mutate = (fn: (data: Data) => Data) => Promise<boolean>;
export function BudgetPanel({
  data,
  mutate,
  busy,
  categories,
  onEditing,
}: {
  data: Data;
  mutate: Mutate;
  busy: boolean;
  categories: string[];
  onEditing: (editing: boolean) => void;
}) {
  const [month, setMonth] = useState(today().slice(0, 7));
  useEffect(() => () => onEditing(false), [onEditing]);
  const budgets = (data.budgets ?? []).filter((b) => b.month === month);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      values = new FormData(form);
    if (
      await mutate((d) =>
        saveBudget(d, {
          month,
          category: String(values.get("category")),
          limit: Number(values.get("limit")),
        }),
      )
    )
      form.reset();
  }
  return (
    <section className="planning-section">
      <div className="planning-heading">
        <h2>Presupuesto mensual</h2>
        <div className="month-switch">
          <button
            type="button"
            aria-label="Presupuesto del mes anterior"
            onClick={() => setMonth(shiftMonth(month, -1))}
          >
            ‹
          </button>
          <strong>
            {new Date(month + "-01T12:00:00").toLocaleDateString("es-MX", {
              month: "long",
              year: "numeric",
            })}
          </strong>
          <button
            type="button"
            aria-label="Presupuesto del mes siguiente"
            onClick={() => setMonth(shiftMonth(month, 1))}
          >
            ›
          </button>
        </div>
      </div>
      <p className="helper">
        Gastos pagados del mes completo, independientemente de los filtros. Las
        compras con TDC cuentan al abonarlas.
      </p>
      {budgets.map((b) => {
        const spent = budgetSpent(data, b),
          left = Math.round((b.limit - spent) * 100) / 100;
        return (
          <article className="planning-item" key={b.category}>
            <strong>{b.category || "General"}</strong>
            <p>
              {money(spent)} de {money(b.limit)}
            </p>
            <progress value={Math.min(spent, b.limit)} max={b.limit} />
            <p className={left < 0 ? "budget-over" : "positive"}>
              {left < 0 ? "Excedido por" : "Disponible"} {money(Math.abs(left))}
            </p>
            <button
              className="text-button"
              disabled={busy}
              onClick={() =>
                void mutate((d) => ({
                  ...d,
                  budgets: (d.budgets ?? []).filter(
                    (item) =>
                      item.month !== month || item.category !== b.category,
                  ),
                }))
              }
            >
              Eliminar presupuesto {b.category || "general"}
            </button>
          </article>
        );
      })}
      {!budgets.length && (
        <p className="helper">Aún no has establecido límites para este mes.</p>
      )}
      <details onToggle={(event) => onEditing(event.currentTarget.open)}>
        <summary>Configurar presupuesto</summary>
        <form onSubmit={save} className="planning-form">
          <label>
            Categoría del presupuesto
            <select name="category" aria-label="Categoría del presupuesto">
              <option value="">General (todos los gastos)</option>
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Límite mensual (MXN)
            <input
              name="limit"
              aria-label="Límite mensual (MXN)"
              type="number"
              inputMode="decimal"
              min="0.01"
              max="999999999"
              step="0.01"
              required
            />
          </label>
          <p className="helper">
            Guardar reemplaza el límite de esa categoría para el mes mostrado.
            El general y las categorías se comparan por separado.
          </p>
          <button className="button secondary" disabled={busy}>
            Guardar presupuesto
          </button>
        </form>
      </details>
    </section>
  );
}
export function RecurringPanel({
  data,
  mutate,
  busy,
  categories,
  onEditing,
}: {
  data: Data;
  mutate: Mutate;
  busy: boolean;
  categories: string[];
  onEditing: (editing: boolean) => void;
}) {
  const [draft, setDraft] = useState<Recurring | null | undefined>(),
    [method, setMethod] = useState("Efectivo");
  const dateId = useId();
  useEffect(() => {
    onEditing(draft !== undefined);
  }, [draft, onEditing]);
  useEffect(() => () => onEditing(false), [onEditing]);
  function edit(rule: Recurring | null) {
    setDraft(rule);
    setMethod(rule?.method ?? "Efectivo");
  }
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      get = (n: string) => String(f.get(n) ?? "");
    const nextDate = get("date");
    const rule: Recurring = {
      id: draft?.id ?? crypto.randomUUID(),
      merchant: get("merchant").trim(),
      category: get("category"),
      amount: Number(get("amount")),
      method,
      nextDate,
      frequency: get("frequency") as Recurring["frequency"],
      active: draft?.active ?? true,
      anchorDay:
        draft?.nextDate === nextDate
          ? draft.anchorDay
          : Number(nextDate.slice(8)),
      ...(method === "Tarjeta de crédito"
        ? { creditDebtId: get("creditDebtId") }
        : {}),
    };
    if (await mutate((d) => saveRecurring(d, rule))) setDraft(undefined);
  }
  return (
    <section className="planning-section">
      <div className="planning-heading">
        <h2>Gastos recurrentes</h2>
        <button className="text-button" onClick={() => edit(null)}>
          Crear recurrente
        </button>
      </div>
      <p className="helper">
        No se registran solos. Confirma cada vencimiento; una compra con TDC
        solo aumentará su deuda.
      </p>
      {(data.recurrents ?? []).map((r) => (
        <article className="planning-item" key={r.id}>
          <strong>{r.merchant}</strong>
          <p>
            {money(r.amount)} ·{" "}
            {r.frequency === "monthly"
              ? "Mensual"
              : r.frequency === "weekly"
                ? "Semanal"
                : "Anual"}{" "}
            · {r.nextDate}
          </p>
          <p>
            {!r.active
              ? "Pausado"
              : r.nextDate <= today()
                ? "Pendiente de confirmar"
                : "Próximo vencimiento"}
          </p>
          <div className="planning-actions">
            <button
              className="button secondary"
              disabled={busy || !r.active || r.nextDate > today()}
              onClick={() => {
                if (
                  confirm(
                    `¿Registrar ${r.merchant} por ${money(r.amount)} con fecha ${r.nextDate}?`,
                  )
                )
                  void mutate((d) => registerRecurring(d, r.id, r.nextDate));
              }}
            >
              Registrar {r.merchant}
            </button>
            <button className="text-button" onClick={() => edit(r)}>
              Editar recurrente {r.merchant}
            </button>
            <button
              className="text-button"
              disabled={busy}
              onClick={() =>
                void mutate((d) => ({
                  ...d,
                  recurrents: d.recurrents?.map((item) =>
                    item.id === r.id ? { ...item, active: !item.active } : item,
                  ),
                }))
              }
            >
              {r.active ? "Pausar" : "Reactivar"} {r.merchant}
            </button>
            <button
              className="text-button"
              disabled={busy}
              onClick={() => {
                if (
                  confirm(
                    "¿Eliminar esta programación? Los movimientos ya registrados se conservan.",
                  )
                )
                  void mutate((d) => ({
                    ...d,
                    recurrents: d.recurrents?.filter(
                      (item) => item.id !== r.id,
                    ),
                  }));
              }}
            >
              Eliminar recurrente {r.merchant}
            </button>
          </div>
        </article>
      ))}
      {draft !== undefined && (
        <form
          key={draft?.id ?? "new"}
          className="planning-form"
          onSubmit={save}
        >
          <h3>{draft ? "Editar recurrente" : "Nuevo recurrente"}</h3>
          <label>
            Concepto recurrente
            <input
              name="merchant"
              aria-label="Concepto recurrente"
              maxLength={120}
              required
              defaultValue={draft?.merchant}
            />
          </label>
          <label>
            Importe recurrente (MXN)
            <input
              name="amount"
              aria-label="Importe recurrente (MXN)"
              type="number"
              inputMode="decimal"
              min="0.01"
              max="999999999"
              step="0.01"
              required
              defaultValue={draft?.amount}
            />
          </label>
          <label>
            Categoría recurrente
            <select
              name="category"
              aria-label="Categoría recurrente"
              defaultValue={draft?.category}
            >
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Método recurrente
            <select
              aria-label="Método recurrente"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            >
              {[
                "Efectivo",
                "Tarjeta de débito",
                "Tarjeta de crédito",
                "Transferencia",
                "Otro",
              ].map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
          {method === "Tarjeta de crédito" && (
            <label>
              Tarjeta recurrente
              <select
                name="creditDebtId"
                aria-label="Tarjeta recurrente"
                required
                defaultValue={draft?.creditDebtId ?? ""}
              >
                <option value="" disabled>
                  Selecciona una tarjeta
                </option>
                {data.debts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.creditor}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            Frecuencia
            <select
              name="frequency"
              aria-label="Frecuencia"
              defaultValue={draft?.frequency ?? "monthly"}
            >
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensual</option>
              <option value="yearly">Anual</option>
            </select>
          </label>
          <div className="field">
            <label htmlFor={dateId}>Próxima fecha</label>
            <DatePicker
              id={dateId}
              name="date"
              required
              defaultValue={draft?.nextDate ?? today()}
            />
          </div>
          <div className="planning-actions">
            <button
              type="button"
              className="button secondary"
              onClick={() => setDraft(undefined)}
            >
              Cancelar recurrente
            </button>
            <button className="button" disabled={busy}>
              Guardar recurrente
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
