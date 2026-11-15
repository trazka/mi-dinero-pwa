import { effectiveFirstCut } from "./installments";
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
      <p className="helper">Se registran una sola vez, al confirmar.</p>
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
          {p.msi && (
            <p className="helper">
              {p.msi.months} MSI · Primer corte al confirmar:{" "}
              {exportDate(
                effectiveFirstCut(
                  p.msi.firstCut,
                  currentDay > p.date ? currentDay : p.date,
                  data.debts.find((d) => d.id === p.creditDebtId),
                ),
              )}
              . Si el corte previsto ya pasó, se ajustará al siguiente.
            </p>
          )}
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
                  return savePending(d, {
                    ...current,
                    date,
                    ...(current.msi
                      ? {
                          msi: {
                            ...current.msi,
                            firstCut: effectiveFirstCut(
                              current.msi.firstCut,
                              date,
                              d.debts.find(
                                (debt) => debt.id === current.creditDebtId,
                              ),
                            ),
                          },
                        }
                      : {}),
                  });
                });
            }}
          />
          <p className="helper">
            Al confirmar se usará la fecha de hoy ({exportDate(currentDay)}).
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
