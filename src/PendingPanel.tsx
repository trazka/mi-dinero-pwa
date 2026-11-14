import { money, type Data } from "./data";
import { exportDate } from "./exports";
import DatePicker from "./DatePicker";
import { savePending, cancelPending, confirmPending } from "./pending";
import type { Mutate } from "./PlanningPanel";

export function PendingPanel({
  data,
  mutate,
  busy,
  currentDay,
}: {
  data: Data;
  mutate: Mutate;
  busy: boolean;
  currentDay: string;
}) {
  const pending = [...(data.pendingMovements ?? [])].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  if (!pending.length) return null;
  return (
    <section
      className="planning-section pending-section"
      aria-label="Movimientos pendientes"
    >
      <h2>Pendientes</h2>
      <p className="helper">
        Son recordatorios de una sola vez. No afectan dinero, deuda ni
        presupuesto hasta confirmar. No se registran automáticamente.
      </p>
      {pending.map((p) => (
        <article className="planning-item" key={p.id}>
          <div className="planning-heading">
            <strong>{p.merchant}</strong>
            <strong>{money(p.amount)}</strong>
          </div>
          <p>
            {p.date <= currentDay ? "Por confirmar" : "Próximo"} ·{" "}
            {exportDate(p.date)} ·{" "}
            {p.type === "payment"
              ? "Abono"
              : p.type === "saving"
                ? "Apartado"
                : p.type === "income"
                  ? "Ingreso"
                  : p.type === "transfer"
                    ? "Traspaso"
                    : p.creditDebtId
                      ? "Compra TDC"
                      : "Gasto"}
          </p>
          {p.notes && <p className="helper">{p.notes}</p>}
          <label htmlFor={`pending-date-${p.id}`}>
            Fecha prevista de {p.merchant}
          </label>
          <DatePicker
            id={`pending-date-${p.id}`}
            value={p.date}
            onChange={(date) => {
              if (!busy)
                void mutate((d) => {
                  const current = d.pendingMovements?.find(
                    (item) => item.id === p.id,
                  );
                  if (!current) throw Error("Este pendiente ya fue atendido.");
                  return savePending(d, { ...current, date });
                });
            }}
          />
          <p className="helper">
            Cambiar fecha prevista. Al confirmar se registrará con fecha de hoy
            ({exportDate(currentDay)}).
          </p>
          <div className="planning-actions">
            <button
              className="button secondary"
              disabled={busy || p.date > currentDay}
              onClick={() => void mutate((d) => confirmPending(d, p.id))}
              aria-label={`Confirmar realizado ${p.merchant}`}
            >
              Confirmar realizado
            </button>
            <button
              className="text-button"
              disabled={busy}
              onClick={() => {
                if (
                  window.confirm(
                    "¿Cancelar este pendiente? No afectará tus saldos.",
                  )
                )
                  void mutate((d) => cancelPending(d, p.id));
              }}
              aria-label={`Cancelar pendiente ${p.merchant}`}
            >
              Cancelar
            </button>
          </div>
        </article>
      ))}
    </section>
  );
}
