import { useEffect, useRef, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
type Theme = "auto" | "light" | "dark";
declare global {
  interface Window {
    miDineroTheme?: { get(): Theme; set(value: Theme): void };
  }
}
export default function ThemeControl() {
  const [open, setOpen] = useState(false),
    [theme, setTheme] = useState<Theme>(
      () => window.miDineroTheme?.get() ?? "auto",
    );
  const ref = useRef<HTMLDivElement>(null),
    trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const change = () => setTheme(window.miDineroTheme?.get() ?? "auto");
    window.addEventListener("theme-change", change);
    return () => window.removeEventListener("theme-change", change);
  }, []);
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  return (
    <div
      className="theme-control"
      ref={ref}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          setOpen(false);
          trigger.current?.focus();
        }
      }}
    >
      <button
        className="theme-trigger"
        ref={trigger}
        type="button"
        aria-label="Apariencia"
        title="Cambiar apariencia"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen(!open)}
      >
        {theme === "light" ? (
          <Sun size={20} />
        ) : theme === "dark" ? (
          <Moon size={20} />
        ) : (
          <Monitor size={20} />
        )}
      </button>
      {open && (
        <section className="theme-menu" role="dialog" aria-label="Apariencia">
          <h2>Apariencia</h2>
          <p>Elige cómo ver Mi dinero</p>
          <div role="group" aria-label="Modo de apariencia">
            {(
              [
                { value: "light", label: "Claro", icon: Sun },
                { value: "dark", label: "Oscuro", icon: Moon },
                { value: "auto", label: "Automático", icon: Monitor },
              ] as const
            ).map((option) => (
              <button
                type="button"
                key={option.value}
                aria-pressed={theme === option.value}
                onClick={() => {
                  window.miDineroTheme?.set(option.value);
                  setOpen(false);
                  trigger.current?.focus();
                }}
              >
                <option.icon size={18} />
                {option.label}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
