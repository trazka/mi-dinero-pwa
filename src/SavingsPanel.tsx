import { useEffect, useState, type FormEvent } from "react";
import MoneyInput from "./MoneyInput";
import { money, type Data, type Saving } from "./data";
import {
  freeAmount,
  reservedAmount,
  savedAmount,
  saveSaving,
  moveSaving,
  removeSaving,
} from "./savings";
import type { Mutate } from "./PlanningPanel";
export default function SavingsPanel({
  data,
  showDetails = true,
  mutate,
  busy,
  creating,
  onClose,
  onEditing,
}: {
  data: Data;
  showDetails?: boolean;
  mutate: Mutate;
  busy: boolean;
  creating: boolean;
  onClose: () => void;
  onEditing: (editing: boolean) => void;
}) {
  const [editing, setEditing] = useState<Saving | null>(null);
  const [operation, setOperation] = useState<{
    id: string;
    type: "deposit" | "withdrawal";
  } | null>(null);
  const open = creating || !!editing || !!operation;
  useEffect(() => {
    onEditing(open);
    return () => onEditing(false);
  }, [open, onEditing]);
  function close() {
    setEditing(null);
    setOperation(null);
    onClose();
  }
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const values = new FormData(e.currentTarget);
    if (
      await mutate((d) =>
        operation
          ? moveSaving(
              d,
              operation.id,
              operation.type,
              Number(values.get("amount")),
            )
          : saveSaving(
              d,
              String(values.get("name")),
              Number(values.get("target")),
              editing?.id,
            ),
      )
    )
      close();
  }
  return (
    <section className="panel full-panel savings-panel">
      <h2>Tu ahorro, por objetivos</h2>
      <p>
        Reserva dinero para una meta. Aportar lo aparta; retirar lo deja libre.
        Tu dinero sigue en tus cuentas.
      </p>
      {showDetails && (
        <div className="report-totals">
          <div>
            <span>Total apartado</span>
            <strong>{money(reservedAmount(data))}</strong>
          </div>
          <div>
            <span>Libre para apartar</span>
            <strong>{money(freeAmount(data))}</strong>
          </div>
        </div>
      )}
      {showDetails && freeAmount(data) < 0 && (
        <p role="status">
          Tus gastos han reducido el dinero libre por debajo de lo apartado.
          Revisa tus apartados y libera fondos si corresponde.
        </p>
      )}
      {open && (
        <form
          className="planning-form"
          onSubmit={save}
          key={
            operation
              ? `${operation.id}-${operation.type}`
              : (editing?.id ?? "new")
          }
        >
          <h3>
            {operation
              ? operation.type === "deposit"
                ? "Aportar al apartado"
                : "Retirar del apartado"
              : editing
                ? "Editar apartado"
                : "Nuevo apartado"}
          </h3>
          {operation ? (
            <label>
              Importe del apartado (MXN)
              <MoneyInput name="amount" required />
            </label>
          ) : (
            <>
              <label>
                Nombre del apartado
                <input
                  name="name"
                  required
                  maxLength={120}
                  defaultValue={editing?.name}
                />
              </label>
              <label>
                Meta de ahorro (MXN)
                <MoneyInput
                  name="target"
                  required
                  defaultValue={editing?.target}
                />
              </label>
            </>
          )}
          <div className="planning-actions">
            <button
              className="button secondary"
              type="button"
              disabled={busy}
              onClick={close}
            >
              Cancelar apartado
            </button>
            <button className="button" disabled={busy}>
              Guardar apartado
            </button>
          </div>
        </form>
      )}
      {!(data.savings ?? []).length && !open && (
        <p>
          Aún no tienes apartados. Crea uno para empezar a reservar dinero para
          tu meta.
        </p>
      )}
      {showDetails &&
        (data.savings ?? []).map((s) => (
          <article className="planning-section" key={s.id}>
            <h3>{s.name}</h3>
            <p>
              {money(savedAmount(s))} de {money(s.target)}
            </p>
            <progress
              aria-label={`Progreso de ${s.name}`}
              max={s.target}
              value={Math.min(s.target, savedAmount(s))}
            />
            <div className="planning-actions">
              <button
                className="button secondary"
                disabled={busy || open}
                onClick={() => setOperation({ id: s.id, type: "deposit" })}
              >
                Aportar a {s.name}
              </button>
              <button
                className="button secondary"
                disabled={busy || open || savedAmount(s) === 0}
                onClick={() => setOperation({ id: s.id, type: "withdrawal" })}
              >
                Retirar de {s.name}
              </button>
              <button disabled={busy || open} onClick={() => setEditing(s)}>
                Editar {s.name}
              </button>
              <button
                disabled={busy || open || savedAmount(s) !== 0}
                onClick={() => {
                  if (
                    confirm(`¿Eliminar el apartado ${s.name} y su historial?`)
                  )
                    void mutate((d) => removeSaving(d, s.id));
                }}
              >
                Eliminar {s.name}
              </button>
            </div>
            <details>
              <summary>Historial de {s.name}</summary>
              {s.entries.length ? (
                s.entries.map((entry) => (
                  <p key={entry.id}>
                    {entry.date} ·{" "}
                    {entry.type === "deposit" ? "Aportación" : "Retiro"} ·{" "}
                    {money(entry.amount)}
                  </p>
                ))
              ) : (
                <p>Sin aportaciones todavía.</p>
              )}
            </details>
          </article>
        ))}
    </section>
  );
}
