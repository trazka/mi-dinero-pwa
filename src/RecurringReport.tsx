import { money, type Recurring } from "./data";
import { recurringMonthlyReport } from "./reports";

const frequencies = { weekly: "Semanal", monthly: "Mensual", yearly: "Anual" };

export default function RecurringReport({
  recurrents,
}: {
  recurrents?: Recurring[];
}) {
  const { items, total, paused } = recurringMonthlyReport(recurrents);
  return (
    <details className="panel report-recurring" name="report-sections">
      <summary>Recurrentes</summary>
      <div className="recurring-report-content">
        {items.length ? (
          <>
            <p className="helper">
              Gasto mensual estimado de los activos; independiente de los
              filtros.
            </p>
            {items.some(({ rule }) => rule.frequency !== "monthly") && (
              <p className="helper">
                Semanales: 52 pagos al año ÷ 12. Anuales: importe ÷ 12.
              </p>
            )}
            <dl className="recurring-report-items">
              {items.map(({ rule, monthly }) => (
                <div key={rule.id}>
                  <dt>
                    {rule.merchant}
                    {rule.frequency !== "monthly" && (
                      <small>
                        {frequencies[rule.frequency]} · {money(rule.amount)}
                      </small>
                    )}
                  </dt>
                  <dd>
                    {money(monthly)} <small>/mes</small>
                  </dd>
                </div>
              ))}
            </dl>
          </>
        ) : (
          <p className="helper">No tienes recurrentes activos.</p>
        )}
        <dl className="recurring-report-total">
          <div>
            <dt>Total mensual</dt>
            <dd>{money(total)}</dd>
          </div>
        </dl>
        {paused > 0 && (
          <p className="helper">
            {paused}{" "}
            {paused === 1 ? "pausado no incluido" : "pausados no incluidos"}.
          </p>
        )}
      </div>
    </details>
  );
}
