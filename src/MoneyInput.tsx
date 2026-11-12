import { useEffect, useRef, useState, type InputHTMLAttributes } from "react";
import { money } from "./data";

type Props = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "defaultValue" | "onChange"
>;

function amount(raw: string): number | undefined {
  const text = raw.trim().replace(/^\$\s*/, "");
  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{0,2})?$/.test(text)) return;
  const value = Number(text.replaceAll(",", ""));
  return Number.isFinite(value) ? value : undefined;
}

export default function MoneyInput({
  name,
  defaultValue,
  min = "0.01",
  max = "999999999",
  step: _step,
  type: _type,
  readOnly,
  disabled,
  ...props
}: Props & { defaultValue?: string | number }) {
  const [raw, setRaw] = useState(
    defaultValue === undefined ? "" : money(Number(defaultValue)),
  );
  const input = useRef<HTMLInputElement>(null);
  const value = amount(raw);
  const valid =
    value !== undefined && value >= Number(min) && value <= Number(max);
  useEffect(() => {
    input.current?.setCustomValidity(
      raw === "" || valid
        ? ""
        : `Introduce un importe entre ${money(Number(min))} y ${money(Number(max))}, con hasta dos decimales.`,
    );
  }, [raw, valid, min, max]);
  return (
    <>
      <input
        {...props}
        ref={input}
        type="text"
        inputMode="decimal"
        readOnly={readOnly}
        disabled={disabled}
        value={raw}
        onFocus={(event) => event.currentTarget.select()}
        onChange={(event) => setRaw(event.target.value)}
        onBlur={() => {
          if (valid) setRaw(money(value!));
        }}
      />
      <input
        type="hidden"
        name={name}
        value={value ?? ""}
        disabled={disabled}
      />
    </>
  );
}
