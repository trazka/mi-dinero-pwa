import { money, type Data, type Debt } from "./data";
import { exportDate } from "./exports";
import { installmentSchedule } from "./installments";
export default function MsiProjection({
  data,
  debt,
}: {
  data: Data;
  debt: Debt;
}) {
  const purchases = data.movements.filter(
    (m) => m.creditDebtId === debt.id && m.msi,
  );
  if (!purchases.length) return null;
  return (
    <details className="msi-projection">
      <summary>Compras a MSI ({purchases.length})</summary>
      <p className="helper">
        Calendario estimado de mensualidades, sin compras normales ni intereses.
        Los abonos generales no se asignan a cada plan.
      </p>
      {purchases.map((m) => (
        <details key={m.id}>
          <summary>
            {m.merchant} · {m.msi!.months} MSI
          </summary>
          <ol className="msi-schedule">
            {installmentSchedule(m, debt).map((p) => (
              <li key={p.number}>
                <span>
                  {p.number}/{m.msi!.months} ·{" "}
                  {p.due
                    ? `Pago: ${exportDate(p.due)}`
                    : `Corte: ${exportDate(p.cut)}`}
                </span>
                <strong>{money(p.amount)}</strong>
              </li>
            ))}
          </ol>
        </details>
      ))}
    </details>
  );
}
