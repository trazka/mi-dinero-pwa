import { useId, useRef, useState, type InputHTMLAttributes } from "react";

const normalized = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");

export default function ConceptInput({
  suggestions,
  value,
  defaultValue,
  onValueChange,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> & {
  suggestions: string[];
  onValueChange?: (value: string) => void;
}) {
  const listId = useId();
  const press = useRef<{ id: number; x: number; y: number } | null>(null);
  const [text, setText] = useState(String(defaultValue ?? ""));
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const current = value === undefined ? text : String(value);
  const matches = [...new Set(suggestions)].filter((item) =>
    normalized(item).includes(normalized(current)),
  );
  const expanded = open && matches.length > 0;
  function choose(next: string) {
    setText(next);
    onValueChange?.(next);
    setOpen(false);
    setActive(-1);
  }

  return (
    <div className="concept-input">
      <input
        {...props}
        value={current}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={expanded ? listId : undefined}
        aria-activedescendant={
          expanded && active >= 0 ? `${listId}-${active}` : undefined
        }
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
          setActive(-1);
          onValueChange?.(e.target.value);
        }}
        onFocus={() => {
          setOpen(true);
          setActive(-1);
        }}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === "Escape" && expanded) {
            e.preventDefault();
            e.stopPropagation();
            setOpen(false);
          }
          if (
            (e.key === "ArrowDown" || e.key === "ArrowUp") &&
            matches.length
          ) {
            e.preventDefault();
            setOpen(true);
            setActive((index) =>
              e.key === "ArrowDown"
                ? (index + 1) % matches.length
                : (index <= 0 ? matches.length : index) - 1,
            );
          }
          if (e.key === "Enter" && expanded && active >= 0) {
            e.preventDefault();
            choose(matches[active]);
          }
        }}
      />
      {expanded && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Conceptos registrados"
          className="concept-options"
        >
          {matches.map((item, index) => (
            <li
              key={item}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === active}
              onPointerDown={(e) => {
                // Keep the input focused. Safari may suppress the compatibility
                // click after this, so select explicitly on pointer release.
                e.preventDefault();
                press.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
              }}
              onPointerCancel={() => {
                press.current = null;
              }}
              onPointerUp={(e) => {
                const start = press.current;
                press.current = null;
                if (
                  start?.id === e.pointerId &&
                  Math.hypot(e.clientX - start.x, e.clientY - start.y) < 10
                ) {
                  e.preventDefault();
                  choose(item);
                }
              }}
              onClick={() => choose(item)}
            >
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
