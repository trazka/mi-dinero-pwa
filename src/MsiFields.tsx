import { useEffect, useRef, useState, useId } from "react";
import { money, type Debt } from "./data";
import DatePicker from "./DatePicker";
import { installmentSchedule, suggestedCut, type Msi } from "./installments";
export default function MsiFields({
  date,
  amount,
  debt,
  initial,
  initialDate,
  initialDebtId,
}: {
  date: string;
  amount: number;
  debt?: Debt;
  initial?: Msi;
  initialDate?: string;
  initialDebtId?: string;
}) {
  const cutId = useId();
  const [enabled, setEnabled] = useState(!!initial);
  const [months, setMonths] = useState(initial?.months ?? 6);
  const [cut, setCut] = useState(initial?.firstCut ?? suggestedCut(date, debt));
  const previous = useRef(`${date}:${debt?.id}`);
  useEffect(() => {
    const key = `${date}:${debt?.id}`;
    if (key !== previous.current) {
      previous.current = key;
      setCut(
        initial && date === initialDate && debt?.id === initialDebtId
          ? initial.firstCut
          : suggestedCut(date, debt),
      );
    }
  }, [date, debt, initial, initialDate, initialDebtId]);
  const schedule =
    months >= 2 && months <= 60 && Number.isInteger(months) && cut && amount > 0
      ? installmentSchedule({ amount, msi: { months, firstCut: cut } }, debt)
      : [];
  return (
    <div className="msi-fields">
      <label className="msi-toggle">
        <input
          type="checkbox"
          name="msiEnabled"
          checked={enabled}
          disabled={!debt}
          onChange={(e) => setEnabled(e.target.checked)}
        />{" "}
        A meses sin intereses
      </label>
      {enabled && (
        <>
          <div className="form-grid">
            <label className="field">
              <span>Número de meses</span>
              <input
                type="number"
                name="msiMonths"
                min="2"
                max="60"
                step="1"
                required
                value={months}
                onChange={(e) => setMonths(Number(e.target.value))}
              />
            </label>
            <div className="field">
              <label htmlFor={cutId}>Primer corte de cobro</label>
              <DatePicker
                id={cutId}
                name="msiFirstCut"
                value={cut}
                min={date}
                required
                onChange={setCut}
              />
            </div>
          </div>
          {schedule.length > 0 && (
            <p className="helper">
              {months} mensualidades de {money(schedule[0].amount)}
              {schedule.at(-1)!.amount !== schedule[0].amount
                ? `; última de ${money(schedule.at(-1)!.amount)}`
                : ""}
              .
            </p>
          )}
          {!debt?.cutDay && (
            <p className="helper">
              Indica el primer corte. Configura corte y límite de la tarjeta
              para estimar las fechas de pago.
            </p>
          )}
        </>
      )}
    </div>
  );
}
