import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { today } from "./data";

type Props = {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  min?: string;
  required?: boolean;
};
const months = Array.from({ length: 12 }, (_, month) =>
  new Date(2026, month, 1).toLocaleDateString("es-MX", { month: "long" }),
);
const isoDate = (year: number, month: number, day: number) =>
  `${String(year).padStart(4, "0")}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
const localDate = (value: string) => new Date(`${value}T12:00:00`);

export default function DatePicker({
  id,
  name,
  value,
  defaultValue = "",
  onChange,
  min,
  required,
}: Props) {
  const [internal, setInternal] = useState(defaultValue);
  const selected = value ?? internal;
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() =>
    localDate(selected || today()).getMonth(),
  );
  const [year, setYear] = useState(() =>
    localDate(selected || today()).getFullYear(),
  );
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };
  const choose = (date: string) => {
    setInternal(date);
    onChange?.(date);
    close();
  };
  const changeMonth = (delta: number) => {
    const next = localDate(isoDate(year, month, 1));
    next.setMonth(next.getMonth() + delta);
    if (next.getFullYear() < 1 || next.getFullYear() > 9999) return;
    setMonth(next.getMonth());
    setYear(next.getFullYear());
  };
  const first = localDate(isoDate(year, month, 1));
  const offset = (first.getDay() + 6) % 7;
  const last = new Date(first);
  last.setMonth(last.getMonth() + 1);
  last.setDate(0);
  const currentYear = Number(today().slice(0, 4));
  const years = [
    ...new Set([
      year,
      ...Array.from({ length: 201 }, (_, index) => currentYear - 100 + index),
    ]),
  ]
    .filter((y) => y > 0 && y <= 9999)
    .sort((a, b) => a - b);
  return (
    <div
      ref={container}
      className="date-picker"
      onKeyDown={(event) => {
        if (open && event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          close();
        }
      }}
    >
      {name && <input type="hidden" name={name} value={selected} />}
      <button
        type="button"
        id={id}
        ref={trigger}
        className="date-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? `${id}-calendar` : undefined}
        onClick={() => {
          if (!open) {
            const date = localDate(selected || today());
            setMonth(date.getMonth());
            setYear(date.getFullYear());
          }
          setOpen(!open);
        }}
      >
        <span>
          {selected
            ? localDate(selected).toLocaleDateString("es-MX", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
            : "Elegir fecha"}
        </span>
        <CalendarDays size={18} />
      </button>
      {open && (
        <section
          id={`${id}-calendar`}
          className="date-calendar"
          role="dialog"
          aria-label="Seleccionar fecha"
        >
          <div className="date-toolbar">
            <button
              type="button"
              aria-label="Mes anterior"
              onClick={() => changeMonth(-1)}
            >
              <ChevronLeft size={19} />
            </button>
            <select
              aria-label="Mes"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
            >
              {months.map((name, index) => (
                <option value={index} key={name}>
                  {name}
                </option>
              ))}
            </select>
            <select
              aria-label="Año"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {years.map((y) => (
                <option key={y}>{y}</option>
              ))}
            </select>
            <button
              type="button"
              aria-label="Mes siguiente"
              onClick={() => changeMonth(1)}
            >
              <ChevronRight size={19} />
            </button>
            <button
              type="button"
              aria-label="Cerrar calendario"
              onClick={close}
            >
              <X size={18} />
            </button>
          </div>
          <div className="date-weekdays" aria-hidden="true">
            {["L", "M", "M", "J", "V", "S", "D"].map((day, index) => (
              <span key={index}>{day}</span>
            ))}
          </div>
          <div className="date-days">
            {Array.from({ length: offset }, (_, index) => (
              <span key={`empty-${index}`} />
            ))}
            {Array.from({ length: last.getDate() }, (_, index) => {
              const date = isoDate(year, month, index + 1);
              return (
                <button
                  type="button"
                  key={date}
                  data-date={date}
                  disabled={!!min && date < min}
                  aria-label={localDate(date).toLocaleDateString("es-MX", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                  aria-pressed={date === selected}
                  aria-current={date === today() ? "date" : undefined}
                  onClick={() => choose(date)}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
          <div className="date-footer">
            <button
              type="button"
              disabled={!!min && today() < min}
              onClick={() => choose(today())}
            >
              Hoy
            </button>
            {!required && (
              <button type="button" onClick={() => choose("")}>
                Quitar fecha
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
