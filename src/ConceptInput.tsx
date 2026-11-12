import { useId, useRef, useState, type InputHTMLAttributes } from "react";

import { normalizeConcept } from "./concepts";

export default function ConceptInput({
  suggestions,
  value,
  defaultValue,
  onValueChange,
  onSelectSuggestion,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> & {
  suggestions: string[];
  onValueChange?: (value: string) => void;
  onSelectSuggestion?: (value: string) => void;
}) {
  const listId = useId();
  const root = useRef<HTMLDivElement>(null);
  const press = useRef<{ id: number; x: number; y: number } | null>(null);
  const [text, setText] = useState(String(defaultValue ?? ""));
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const current = value === undefined ? text : String(value);
  const matches = [...new Set(suggestions)].filter((item) =>
    normalizeConcept(item).includes(normalizeConcept(current)),
  );
  const expanded = open && matches.length > 0;
  function choose(next: string) {
    setText(next);
    onValueChange?.(next);
    onSelectSuggestion?.(next);
    setOpen(false);
    setActive(-1);
  }

  return (
    <div className="concept-input" ref={root}>
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
        onBlur={() => {
          // On iOS a tap can blur the input before pointerup/click. Keep the
          // option mounted until that interaction finishes.
          if (!press.current) setOpen(false);
        }}
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
            <li key={item} role="presentation">
              <button
                type="button"
                tabIndex={-1}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === active}
                onPointerDown={(e) => {
                  press.current = {
                    id: e.pointerId,
                    x: e.screenX,
                    y: e.screenY,
                  };
                  // Mouse selection keeps focus in the input. Touch may close
                  // the keyboard; screen coordinates remain stable when it does.
                  if (e.pointerType === "mouse") e.preventDefault();
                }}
                onPointerCancel={() => {
                  press.current = null;
                  if (!root.current?.contains(document.activeElement))
                    setOpen(false);
                }}
                onPointerUp={(e) => {
                  const start = press.current;
                  press.current = null;
                  if (
                    start?.id === e.pointerId &&
                    Math.hypot(e.screenX - start.x, e.screenY - start.y) < 10
                  ) {
                    e.preventDefault();
                    choose(item);
                  } else if (!root.current?.contains(document.activeElement)) {
                    setOpen(false);
                  }
                }}
                onClick={() => choose(item)}
              >
                {item}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
