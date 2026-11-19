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
    <details className="panel report-recurring">
      <summary>
        <span>Recurrentes</span>
        <span className="recurring-monthly-total">
          {money(total)} <small>/mes</small>
        </span>
      </summary>
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
                    <small>
                      {frequencies[rule.frequency]} · {money(rule.amount)}
                    </small>
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
