import SavingsPanel from "./SavingsPanel";
import { freeAmount, reservedAmount } from "./savings";
import { SecurityPanel } from "./SecurityGate";
import MoneyInput from "./MoneyInput";
import { BudgetPanel, RecurringPanel } from "./PlanningPanel";
import {
  backupOverdue,
  cardCycle,
  editDebt,
  matchesSearch,
  movementDebtId,
} from "./planning";
import ThemeControl from "./ThemeControl";
import DatePicker from "./DatePicker";
import {
  cloneElement,
  useId,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Home,
  ArrowLeftRight,
  HandCoins,
  ChartNoAxesCombined,
  ShieldCheck,
  Download,
  Upload,
  X,
  Pencil,
  Trash2,
  Wallet,
  ChevronRight,
  Leaf,
  PiggyBank,
} from "lucide-react";
import {
  balance,
  expenseAmount,
  saveMovement,
  cents,
  changeData,
  csv,
  empty,
  money,
  payDebt,
  readData,
  removeMovement,
  today,
  validateBackup,
  type Data,
  type Debt,
  type Movement,
} from "./data";
type Tab =
  "Inicio" | "Movimientos" | "Deudas" | "Reportes" | "Respaldos" | "Apartados";
type Modal =
  | { kind: "movement"; movement?: Movement }
  | { kind: "debt"; debt?: Debt }
  | { kind: "payment"; debt: Debt }
  | null;
const categories = [
  "Alimentación",
  "Transporte",
  "Compras",
  "Hogar",
  "Salud",
  "Entretenimiento",
  "Educación",
  "Sueldo",
  "Otros",
];
const tabs: { name: Tab; icon: typeof Home }[] = [
  { name: "Inicio", icon: Home },
  { name: "Movimientos", icon: ArrowLeftRight },
  { name: "Deudas", icon: HandCoins },
  { name: "Apartados", icon: PiggyBank },
  { name: "Reportes", icon: ChartNoAxesCombined },
  { name: "Respaldos", icon: ShieldCheck },
];
const dateLabel = (d: string) =>
  new Date(d + "T12:00:00").toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
  });
function Field({ label, children }: { label: string; children: ReactNode }) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {cloneElement(children as ReactElement<{ id: string }>, { id })}
    </div>
  );
}
function download(content: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function App() {
  const [data, setData] = useState<Data>(empty),
    [loaded, setLoaded] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [tab, setTab] = useState<Tab>("Inicio"),
    [modal, setModal] = useState<Modal>(null),
    [busy, setBusy] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(
    !!window.__miDineroUpdate,
  );
  const [updating, setUpdating] = useState(false);
  const [savingCreating, setSavingCreating] = useState(false);
  const [planningEditing, setPlanningEditing] = useState(false);
  const [movementType, setMovementType] = useState<
    Movement["type"] | "credit" | "payment"
  >("expense");
  const [movementMethod, setMovementMethod] = useState("Efectivo");
  const [debtKind, setDebtKind] = useState("normal");
  useEffect(() => {
    if (modal?.kind === "movement") {
      setMovementType(
        modal.movement?.creditDebtId
          ? "credit"
          : (modal.movement?.type ?? "expense"),
      );
      setMovementMethod(modal.movement?.method ?? "Efectivo");
    }
    if (modal?.kind === "debt") setDebtKind(modal.debt?.kind ?? "normal");
  }, [modal]);
  const modalRef = useRef<HTMLElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const swipe = useRef<{ x: number; y: number; time: number } | null>(null);
  const merchantOptions = [
    ...new Set([
      ...data.movements.map((m) => m.merchant),
      ...(data.recurrents ?? []).map((r) => r.merchant),
    ]),
  ]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "es"));
  useEffect(() => {
    if (!modal) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = modalRef.current;
    const focusable = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          "button:not(:disabled),input:not(:disabled),select,textarea",
        ) ?? [],
      );
    (
      dialog?.querySelector<HTMLElement>("[autofocus]") ?? focusable()[0]
    )?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) setModal(null);
      if (e.key === "Tab") {
        const all = focusable(),
          first = all[0],
          last = all.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [modal, busy]);
  useEffect(() => {
    const mobile = matchMedia("(max-width: 800px)");
    let frame = 0;
    const resize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        document.documentElement.style.setProperty(
          "--app-height",
          `${window.visualViewport?.height ?? window.innerHeight}px`,
        );
      });
    };
    const resetDocument = () => {
      resize();
      if (mobile.matches) window.scrollTo(0, 0);
    };
    resize();
    mobile.addEventListener("change", resetDocument);
    window.addEventListener("resize", resize);
    window.visualViewport?.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(frame);
      mobile.removeEventListener("change", resetDocument);
      window.removeEventListener("resize", resize);
      window.visualViewport?.removeEventListener("resize", resize);
      document.documentElement.style.removeProperty("--app-height");
    };
  }, []);
  const [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [category, setCategory] = useState(""),
    [merchant, setMerchant] = useState(""),
    [period, setPeriod] = useState("monthly");
  const [search, setSearch] = useState(""),
    [methodFilter, setMethodFilter] = useState(""),
    [debtFilter, setDebtFilter] = useState("");
  useEffect(() => {
    readData()
      .then((d) => {
        setData(d);
        setLoaded(true);
      })
      .catch(() =>
        setError(
          "No se pudo abrir el almacenamiento. Permite el almacenamiento local y vuelve a cargar.",
        ),
      );
    const offline = () =>
      setNotice(
        (current) => current || "Aplicación lista para usar sin internet.",
      );
    const update = () => setUpdateAvailable(true);
    if (window.__miDineroUpdate) setUpdateAvailable(true);
    window.addEventListener("offline-ready", offline);
    window.addEventListener("update-ready", update);
    return () => {
      window.removeEventListener("offline-ready", offline);
      window.removeEventListener("update-ready", update);
    };
  }, []);
  async function mutate(fn: (d: Data) => Data) {
    if (busy || !loaded) return false;
    setBusy(true);
    setError("");
    try {
      setData(await changeData(fn));
      setModal(null);
      setNotice("Datos guardados en este dispositivo.");
      return true;
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "No se pudo guardar. Revisa el espacio disponible.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function exportBackup() {
    if (busy || !loaded) return;
    let started = false;
    const exportedAt = new Date().toISOString();
    setError("");
    try {
      // Start the download inside the tap handler; mobile Safari may reject a
      // programmatic download after an asynchronous storage operation.
      download(
        JSON.stringify({ ...data, lastBackupAt: exportedAt }, null, 2),
        `mi-dinero-${today()}.json`,
        "application/json",
      );
      started = true;
      setBusy(true);
      const next = await changeData((d) => ({
        ...d,
        lastBackupAt: exportedAt,
      }));
      setData(next);
      setNotice("Respaldo generado. Guarda el archivo en un lugar seguro.");
    } catch {
      if (started)
        setNotice(
          "Respaldo generado, pero no se pudo guardar su fecha en este dispositivo. Comprueba que guardaste el archivo.",
        );
      else setError("No se pudo generar el respaldo. Inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  }
  const incomes = data.movements
      .filter((m) => m.type === "income")
      .reduce((s, m) => s + m.amount, 0),
    expenses = data.movements.reduce((s, m) => s + expenseAmount(m), 0),
    pending = data.debts.reduce((s, d) => s + balance(d), 0);
  useEffect(() => {
    pageRef.current?.scrollTo({ top: 0 });
    window.scrollTo({ top: 0 });
    if (tab !== "Apartados") setSavingCreating(false);
  }, [tab]);
  const creditDebts = data.debts.filter((d) => d.kind === "credit");
  const filtered = data.movements
    .filter(
      (m) =>
        (!from || m.date >= from) &&
        (!to || m.date <= to) &&
        (!category || m.category === category) &&
        m.merchant.toLocaleLowerCase().includes(merchant.toLocaleLowerCase()) &&
        matchesSearch(m, search) &&
        (!methodFilter || m.method === methodFilter) &&
        (!debtFilter || movementDebtId(data, m) === debtFilter),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  const recent = [...data.movements]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);
  function saveForm(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget),
      get = (n: string) => String(form.get(n) ?? "").trim(),
      num = (n: string) => Number(get(n));
    if (!modal) return;
    if (modal.kind === "movement") {
      if (movementType === "payment") {
        void mutate((d) =>
          payDebt(d, get("debtId"), num("amount"), get("date")),
        );
        return;
      }
      const m: Movement = {
        id: modal.movement?.id ?? crypto.randomUUID(),
        type: get("type") === "income" ? "income" : "expense",
        date: get("date"),
        merchant: get("merchant"),
        category: get("category"),
        amount: num("amount"),
        method:
          movementType === "credit" ? "Tarjeta de crédito" : get("method"),
        notes: get("notes"),
      };
      if (!cents(m.amount)) {
        setError("Introduce un importe válido con hasta dos decimales.");
        return;
      }
      if (m.type === "expense" && m.method === "Tarjeta de crédito")
        m.creditDebtId = get("creditDebtId");
      void mutate((d) => saveMovement(d, m));
    }
    if (modal.kind === "debt") {
      const metadata = {
        creditor: get("creditor"),
        due: get("due"),
        notes: get("debtNotes"),
        cutDay: get("cutDay") ? num("cutDay") : undefined,
        paymentDay: get("paymentDay") ? num("paymentDay") : undefined,
      };
      if (modal.debt) {
        void mutate((d) => editDebt(d, modal.debt!.id, metadata));
        return;
      }
      if (
        (metadata.cutDay === undefined) !==
        (metadata.paymentDay === undefined)
      ) {
        setError(
          "Indica tanto el día de corte como el día límite, o deja ambos vacíos.",
        );
        return;
      }
      const original = num("original"),
        initialBalance = num("balance");
      if (
        !(cents(original) || (debtKind === "credit" && original === 0)) ||
        !Number.isFinite(initialBalance) ||
        initialBalance < 0 ||
        initialBalance > original ||
        Math.abs(initialBalance * 100 - Math.round(initialBalance * 100)) >
          0.0001
      ) {
        setError(
          "El saldo debe estar entre cero y el importe original, con hasta dos decimales.",
        );
        return;
      }
      void mutate((d) => ({
        ...d,
        debts: [
          ...d.debts,
          {
            id: crypto.randomUUID(),
            original,
            initialBalance,
            payments: [],
            ...metadata,
            ...(debtKind === "credit"
              ? { kind: "credit" as const, charges: [] }
              : {}),
          },
        ],
      }));
    }
    if (modal.kind === "payment")
      void mutate((d) => payDebt(d, modal.debt.id, num("amount"), get("date")));
  }
  function movementList(items: Movement[]) {
    return items.length ? (
      <div className="movement-list">
        {items.map((m) => (
          <article className="movement" key={m.id}>
            <div className={"movement-icon " + m.type}>
              {m.type === "income" ? (
                <ArrowDownLeft size={20} />
              ) : (
                <ArrowUpRight size={20} />
              )}
            </div>
            <div className="movement-info">
              <strong>{m.merchant}</strong>
              <small>
                {m.category} <span>·</span> {dateLabel(m.date)}
              </small>
              <small>
                {m.method}
                {m.notes ? ` · ${m.notes}` : ""}
              </small>
              {m.creditDebtId && (
                <small>
                  Compra a deuda · No suma al gasto · Tarjeta:{" "}
                  {data.debts.find((d) => d.id === m.creditDebtId)?.creditor}
                </small>
              )}
              {m.paymentId && (
                <small>
                  {m.creditPaymentDebtId
                    ? "Abono de tarjeta · Cuenta como gasto"
                    : "Abono vinculado · elimina para revertir"}
                </small>
              )}
            </div>
            <div className="movement-right">
              <strong className={m.type === "income" ? "positive" : ""}>
                {m.type === "income" ? "+" : m.creditDebtId ? "" : "−"}
                {money(m.amount)}
              </strong>
              <div className="row-actions">
                {!m.paymentId && (
                  <button
                    aria-label={`Editar ${m.merchant}`}
                    onClick={() => {
                      setError("");
                      setModal({ kind: "movement", movement: m });
                    }}
                  >
                    <Pencil size={14} />
                  </button>
                )}
                <button
                  aria-label={`Eliminar ${m.merchant}`}
                  onClick={() => {
                    if (
                      confirm(
                        m.paymentId
                          ? "¿Eliminar este abono y devolver su importe al saldo de la deuda?"
                          : "¿Eliminar este movimiento?",
                      )
                    )
                      void mutate((d) => removeMovement(d, m.id));
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    ) : (
      <div className="empty">
        <Wallet size={32} />
        <h3>Tu historia financiera empieza aquí</h3>
        <p>
          Registra un movimiento para comenzar a ver tus finanzas con claridad.
        </p>
        <button
          className="button secondary"
          onClick={() => setModal({ kind: "movement" })}
        >
          Registrar movimiento
        </button>
      </div>
    );
  }
  const groupTotals = new Map<string, { income: number; expense: number }>();
  for (const m of filtered) {
    let key = m.date;
    if (period === "monthly") key = m.date.slice(0, 7);
    if (period === "weekly") {
      const d = new Date(m.date + "T12:00:00Z");
      d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
      key = d.toISOString().slice(0, 10);
    }
    const group = groupTotals.get(key) ?? { income: 0, expense: 0 };
    group[m.type === "income" ? "income" : "expense"] +=
      m.type === "income" ? m.amount : expenseAmount(m);
    groupTotals.set(key, group);
  }
  const filters = (
    <div className="filters">
      <Field label="Buscar movimientos">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Concepto, notas o importe"
        />
      </Field>
      <Field label="Filtrar método">
        <select
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value)}
        >
          <option value="">Todos los métodos</option>
          {[
            ...new Set([
              "Efectivo",
              "Tarjeta de débito",
              "Tarjeta de crédito",
              "Transferencia",
              "Otro",
              ...data.movements.map((m) => m.method),
            ]),
          ].map((method) => (
            <option key={method}>{method}</option>
          ))}
        </select>
      </Field>
      <Field label="Filtrar tarjeta o deuda">
        <select
          value={debtFilter}
          onChange={(e) => setDebtFilter(e.target.value)}
        >
          <option value="">Todas las deudas</option>
          {data.debts.map((d) => (
            <option key={d.id} value={d.id}>
              {d.creditor}
            </option>
          ))}
        </select>
      </Field>
      <button
        className="text-button"
        onClick={() => {
          setSearch("");
          setMethodFilter("");
          setDebtFilter("");
          setFrom("");
          setTo("");
          setCategory("");
          setMerchant("");
        }}
      >
        Limpiar filtros
      </button>
      <Field label="Desde">
        <DatePicker value={from} onChange={setFrom} />
      </Field>
      <Field label="Hasta">
        <DatePicker value={to} min={from || undefined} onChange={setTo} />
      </Field>
      <Field label="Categoría">
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Todas las categorías</option>
          {[
            ...new Set([
              ...categories,
              ...data.movements.map((m) => m.category),
            ]),
          ].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </Field>
      <Field label="Establecimiento">
        <input
          value={merchant}
          onChange={(e) => setMerchant(e.target.value)}
          list="merchant-suggestions"
          placeholder="Buscar establecimiento"
        />
      </Field>
      {from && to && from > to && (
        <p role="alert">La fecha inicial debe ser anterior a la final.</p>
      )}
    </div>
  );
  return (
    <div className="app">
      <datalist id="merchant-suggestions">
        {merchantOptions.map((value) => (
          <option key={value} value={value} />
        ))}
      </datalist>
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setTab("Inicio");
          }}
        >
          <span className="brand-icon">
            <Wallet size={23} />
          </span>
          mi dinero<span className="brand-dot">.</span>
        </a>
        <p className="nav-label">TU ESPACIO PERSONAL</p>
        <nav>
          {tabs.map((t) => (
            <button
              key={t.name}
              className={tab === t.name ? "active" : ""}
              aria-current={tab === t.name ? "page" : undefined}
              onClick={() => setTab(t.name)}
            >
              <t.icon size={20} />
              <span>{t.name}</span>
              {tab === t.name && <i />}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <ShieldCheck size={24} />
          <strong>Solo tú y tus finanzas</strong>
          <p>Tus datos se quedan en este dispositivo. Siempre.</p>
          <span>
            <b /> Almacenamiento local
          </span>
        </div>
        <div className="sidebar-bottom">
          Hecho para tu tranquilidad <Leaf size={14} />
        </div>
      </aside>
      <main>
        <header className="topbar">
          <div className="app-identity">
            <img
              src={`${import.meta.env.BASE_URL}icon-v2.svg`}
              alt=""
              width="32"
              height="32"
            />
            <span>Mi dinero</span>
          </div>
          <div>
            <span className="local-badge">
              <b /> Privado y local
            </span>
            <ThemeControl />
          </div>
        </header>
        <div
          className="page"
          ref={pageRef}
          onTouchStart={(e) => {
            swipe.current = null;
            if (modal || planningEditing || e.touches.length !== 1) return;
            let target = e.target as HTMLElement;
            if (
              target.closest(
                "input, select, textarea, button, a, [role=dialog]",
              )
            )
              return;
            while (target && target !== e.currentTarget) {
              if (
                target.scrollWidth > target.clientWidth &&
                ["auto", "scroll"].includes(getComputedStyle(target).overflowX)
              )
                return;
              target = target.parentElement!;
            }
            swipe.current = {
              x: e.touches[0].clientX,
              y: e.touches[0].clientY,
              time: Date.now(),
            };
          }}
          onTouchCancel={() => {
            swipe.current = null;
          }}
          onTouchMove={(e) => {
            if (
              e.touches.length !== 1 ||
              (swipe.current &&
                Math.abs(e.touches[0].clientY - swipe.current.y) > 20 &&
                Math.abs(e.touches[0].clientY - swipe.current.y) >
                  Math.abs(e.touches[0].clientX - swipe.current.x))
            )
              swipe.current = null;
          }}
          onTouchEnd={(e) => {
            const start = swipe.current;
            swipe.current = null;
            if (!start || modal || planningEditing || !e.changedTouches.length)
              return;
            const dx = e.changedTouches[0].clientX - start.x;
            const dy = e.changedTouches[0].clientY - start.y;
            if (
              Date.now() - start.time > 1200 ||
              Math.abs(dx) < 60 ||
              Math.abs(dx) < Math.abs(dy) * 1.5
            )
              return;
            const next =
              tabs[tabs.findIndex((t) => t.name === tab) + (dx < 0 ? 1 : -1)];
            if (next) setTab(next.name);
          }}
        >
          <div className="page-heading">
            <div>
              <p className="eyebrow">TUS FINANZAS PERSONALES</p>
              <h1>{tab === "Inicio" ? "Tu resumen" : tab}</h1>
              <p>
                {tab === "Inicio"
                  ? "Tu dinero, al día."
                  : (
                      {
                        Movimientos: "Cada ingreso y gasto, en un solo lugar.",
                        Deudas: "Un paso más cerca de estar al día.",
                        Reportes: "Entiende a dónde va tu dinero.",
                        Apartados: "Reserva dinero para tus metas.",
                        Respaldos: "Cuida lo que llevas registrado.",
                      } as Record<string, string>
                    )[tab]}
              </p>
            </div>
            {tab !== "Respaldos" && (
              <button
                className="button section-add"
                disabled={!loaded || !!modal || planningEditing}
                onClick={() => {
                  setError("");
                  if (tab === "Apartados") {
                    setSavingCreating(true);
                    return;
                  }
                  setModal(
                    tab === "Deudas" ? { kind: "debt" } : { kind: "movement" },
                  );
                }}
              >
                <Plus size={18} />
                {tab === "Apartados"
                  ? "Nuevo apartado"
                  : tab === "Deudas"
                    ? "Nueva deuda"
                    : "Nuevo movimiento"}
              </button>
            )}
          </div>
          {error && (
            <div className="alert" role="alert">
              {error}
            </div>
          )}
          {updateAvailable && (
            <div className="notice" role="status">
              <span>
                Hay una nueva versión disponible.
                {modal || planningEditing
                  ? " Guarda o cierra el formulario antes de actualizar."
                  : ""}
              </span>
              <button
                className="button secondary"
                disabled={
                  !!modal || planningEditing || busy || updating || !loaded
                }
                onClick={async () => {
                  if (!window.__miDineroUpdate) return;
                  setUpdating(true);
                  try {
                    await window.__miDineroUpdate();
                  } catch {
                    setError(
                      "No se pudo actualizar. Revisa la conexión e inténtalo de nuevo.",
                    );
                  } finally {
                    setUpdating(false);
                  }
                }}
              >
                {updating ? "Actualizando…" : "Actualizar aplicación"}
              </button>
            </div>
          )}
          {notice && (
            <div className="notice" role="status">
              {notice}
              <button aria-label="Cerrar aviso" onClick={() => setNotice("")}>
                <X size={16} />
              </button>
            </div>
          )}
          {!loaded && !error && <p>Cargando tus datos…</p>}
          {tab === "Inicio" && (
            <>
              {(data.movements.length > 0 ||
                data.debts.length > 0 ||
                !!data.budgets?.length ||
                !!data.recurrents?.length ||
                !!data.savings?.length) &&
                backupOverdue(data.lastBackupAt) && (
                  <div className="notice">
                    <span>
                      {data.lastBackupAt
                        ? "Han pasado 7 días desde tu última exportación."
                        : "Tus registros aún no tienen respaldo."}
                    </span>
                    <button
                      className="text-button"
                      disabled={busy}
                      onClick={() => void exportBackup()}
                    >
                      Crear respaldo ahora
                    </button>
                  </div>
                )}
              {!!data.savings?.length && (
                <div className="notice savings-summary">
                  <span>
                    Apartado para tus metas: {money(reservedAmount(data))} ·
                    Saldo libre: {money(freeAmount(data))}
                  </span>
                  <button
                    className="text-button"
                    onClick={() => setTab("Apartados")}
                  >
                    Ver apartados
                  </button>
                </div>
              )}
              <section className="overview">
                <div className="balance-card">
                  <div className="balance-label">
                    <span>Saldo disponible</span>
                    <Wallet size={23} />
                  </div>
                  <div className="balance-number">
                    {money(incomes - expenses)}
                    <span>MXN</span>
                  </div>
                  <p>
                    <span className="light-dot" /> Ingresos menos gastos
                    registrados
                  </p>
                  <div className="balance-decoration" />
                </div>
                <div className="stat">
                  <span className="stat-icon income">
                    <ArrowDownLeft size={20} />
                  </span>
                  <span>Ingresos</span>
                  <strong>{money(incomes)}</strong>
                  <small>Total registrado</small>
                </div>
                <div className="stat">
                  <span className="stat-icon expense">
                    <ArrowUpRight size={20} />
                  </span>
                  <span>Egresos</span>
                  <strong>{money(expenses)}</strong>
                  <small>Pagos y abonos realizados</small>
                </div>
              </section>
              <section className="dashboard-grid">
                <div className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Últimos movimientos</h2>
                      <p>Los pequeños detalles de tu día a día</p>
                    </div>
                    <button
                      className="text-button"
                      onClick={() => setTab("Movimientos")}
                    >
                      Ver todos <ChevronRight size={16} />
                    </button>
                  </div>
                  {movementList(recent)}
                </div>
                <div className="right-column">
                  <div className="panel debt-summary">
                    <span className="stat-icon debt">
                      <HandCoins size={22} />
                    </span>
                    <h2>Deudas pendientes</h2>
                    <strong className="debt-number">{money(pending)}</strong>
                    <p>
                      {data.debts.filter((d) => balance(d) > 0).length} deudas
                      por liquidar
                    </p>
                    <div className="divider" />
                    <p>Organizarte hoy es darle tranquilidad a tu mañana.</p>
                    <button
                      className="text-button"
                      onClick={() => setTab("Deudas")}
                    >
                      Administrar deudas <ChevronRight size={16} />
                    </button>
                  </div>
                  <div className="tip">
                    <Leaf size={23} />
                    <div>
                      <strong>A tu ritmo, pero hacia adelante</strong>
                      <p>
                        El hábito de registrar es el primer paso para tomar
                        mejores decisiones.
                      </p>
                    </div>
                  </div>
                </div>
              </section>
              <div className="privacy-footer">
                <ShieldCheck size={16} /> Tu información es tuya. Sin cuentas,
                sin conexiones bancarias.
              </div>
            </>
          )}
          {tab === "Movimientos" && (
            <section className="panel full-panel">
              <RecurringPanel
                onEditing={setPlanningEditing}
                data={data}
                mutate={mutate}
                busy={busy}
                categories={[...categories, "Pago de deuda"]}
              />
              {filters}
              <div className="panel-heading">
                <h2>{filtered.length} movimientos</h2>
                <button
                  className="text-button"
                  onClick={() =>
                    download(
                      csv(filtered),
                      `movimientos-${today()}.csv`,
                      "text/csv;charset=utf-8",
                    )
                  }
                >
                  Exportar CSV <Download size={16} />
                </button>
              </div>
              {movementList(filtered)}
            </section>
          )}
          {tab === "Deudas" && (
            <>
              <div className="summary-strip">
                <span>Saldo pendiente total</span>
                <strong>{money(pending)}</strong>
              </div>
              <p className="helper">
                Las compras con tarjeta solo aumentan la deuda. El gasto y la
                reducción del saldo disponible se registran al abonar. No
                registres el abono otra vez como gasto.
              </p>
              <div className="debt-grid">
                {data.debts.map((d) => {
                  const cycle = cardCycle(d, data);
                  const due = cycle
                    ? cycle.amount > 0
                      ? cycle.due
                      : cycle.nextDue
                    : d.due;
                  return (
                    <section className="panel debt-detail" key={d.id}>
                      <div className="panel-heading">
                        <h2>{d.creditor}</h2>
                        <button
                          className="text-button"
                          aria-label={`Editar deuda ${d.creditor}`}
                          onClick={() => {
                            setError("");
                            setModal({ kind: "debt", debt: d });
                          }}
                        >
                          Editar
                        </button>
                        <span
                          className={"pill " + (balance(d) === 0 ? "paid" : "")}
                        >
                          {balance(d) === 0
                            ? "Liquidada"
                            : (
                                  cycle
                                    ? cycle!.amount > 0 && cycle!.due < today()
                                    : d.due < today()
                                )
                              ? "Vencida"
                              : "Pendiente"}
                        </span>
                      </div>
                      <p>Saldo pendiente</p>
                      <strong className="debt-number">
                        {money(balance(d))}
                      </strong>
                      <progress
                        value={
                          d.original +
                          (d.charges ?? []).reduce(
                            (sum, c) => sum + c.amount,
                            0,
                          ) -
                          balance(d)
                        }
                        max={Math.max(
                          0.01,
                          d.original +
                            (d.charges ?? []).reduce(
                              (sum, c) => sum + c.amount,
                              0,
                            ),
                        )}
                      />
                      <div className="debt-meta">
                        <span>
                          {d.kind === "credit"
                            ? "Tarjeta · Apertura"
                            : "Original"}
                          : {money(d.original)}
                          {d.kind === "credit" &&
                            ` · Compras: ${money((d.charges ?? []).reduce((sum, c) => sum + c.amount, 0))}`}
                        </span>
                        <span>
                          {cycle ? "Límite de pago" : "Vence"}: {dateLabel(due)}{" "}
                          {due.slice(0, 4)}
                        </span>
                      </div>
                      {cycle && (
                        <div className="cycle-info">
                          <p>
                            Corte: {dateLabel(cycle!.cut)} · Límite:{" "}
                            {dateLabel(due)}
                          </p>
                          <strong>
                            Pendiente al corte: {money(cycle!.amount)}
                          </strong>
                          <p className="helper">
                            Estimación con los movimientos registrados, sin
                            intereses ni comisiones bancarias. Los días 29–31 se
                            ajustan al último día del mes.
                          </p>
                        </div>
                      )}
                      {d.notes && <p className="helper">{d.notes}</p>}
                      <button
                        className="button secondary"
                        disabled={balance(d) === 0}
                        onClick={() => setModal({ kind: "payment", debt: d })}
                      >
                        <Plus size={17} /> Registrar abono
                      </button>
                      <details>
                        <summary>
                          Historial de abonos ({d.payments.length})
                        </summary>
                        {d.payments.length ? (
                          d.payments.map((p) => (
                            <div className="payment" key={p.id}>
                              <span>
                                {dateLabel(p.date)} · {money(p.amount)}
                              </span>
                              <button
                                aria-label={`Revertir abono de ${d.creditor}`}
                                onClick={() => {
                                  if (
                                    confirm(
                                      "¿Revertir este abono? Se eliminará también su gasto vinculado.",
                                    )
                                  )
                                    void mutate((data) =>
                                      removeMovement(data, p.movementId),
                                    );
                                }}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))
                        ) : (
                          <p>Aún no hay abonos registrados.</p>
                        )}
                      </details>
                    </section>
                  );
                })}
              </div>
              {!data.debts.length && (
                <div className="panel empty">
                  <HandCoins size={34} />
                  <h3>Todo empieza con un plan</h3>
                  <p>Agrega tus deudas y lleva el control de cada abono.</p>
                  <button
                    className="button secondary"
                    onClick={() => setModal({ kind: "debt" })}
                  >
                    Registrar deuda
                  </button>
                </div>
              )}
            </>
          )}
          {tab === "Apartados" && (
            <SavingsPanel
              data={data}
              mutate={mutate}
              busy={busy}
              creating={savingCreating}
              onClose={() => setSavingCreating(false)}
              onEditing={setPlanningEditing}
            />
          )}
          {tab === "Reportes" && (
            <section className="panel full-panel">
              <BudgetPanel
                onEditing={setPlanningEditing}
                data={data}
                mutate={mutate}
                busy={busy}
                categories={[
                  ...new Set([
                    ...categories,
                    "Pago de deuda",
                    ...data.movements.map((m) => m.category),
                  ]),
                ]}
              />
              {filters}
              <Field label="Agrupar por">
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                >
                  <option value="daily">Día</option>
                  <option value="weekly">Semana (lunes a domingo)</option>
                  <option value="monthly">Mes</option>
                </select>
              </Field>
              <div className="report-totals">
                <div>
                  <span>Ingresos filtrados</span>
                  <strong className="positive">
                    {money(
                      filtered
                        .filter((m) => m.type === "income")
                        .reduce((s, m) => s + m.amount, 0),
                    )}
                  </strong>
                </div>
                <div>
                  <span>Egresos filtrados</span>
                  <strong>
                    {money(filtered.reduce((s, m) => s + expenseAmount(m), 0))}
                  </strong>
                </div>
              </div>
              {groupTotals.size ? (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Periodo</th>
                        <th>Ingresos</th>
                        <th>Egresos</th>
                        <th>Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...groupTotals]
                        .sort(([a], [b]) => b.localeCompare(a))
                        .map(([key, g]) => (
                          <tr key={key}>
                            <td>
                              {period === "weekly" ? "Semana del " : ""}
                              {period === "monthly"
                                ? new Date(
                                    key + "-01T12:00:00",
                                  ).toLocaleDateString("es-MX", {
                                    month: "long",
                                    year: "numeric",
                                  })
                                : dateLabel(key) + " " + key.slice(0, 4)}
                            </td>
                            <td className="positive">{money(g.income)}</td>
                            <td>{money(g.expense)}</td>
                            <td>{money(g.income - g.expense)}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty">
                  <ChartNoAxesCombined size={32} />
                  <h3>Aún no hay datos para este periodo</h3>
                  <p>
                    Agrega movimientos o ajusta los filtros para ver tus
                    totales.
                  </p>
                </div>
              )}
            </section>
          )}
          {tab === "Respaldos" && (
            <div className="backup-grid">
              <SecurityPanel />
              <div className="panel backup backup-history">
                <h2>Tu último respaldo</h2>
                <p>
                  {data.lastBackupAt
                    ? `Exportación iniciada: ${new Date(data.lastBackupAt).toLocaleString("es-MX")}`
                    : "Todavía no has exportado un respaldo."}
                </p>
                <p>
                  {backupOverdue(data.lastBackupAt)
                    ? "Te recomendamos exportar un respaldo cada semana."
                    : "Tu respaldo está al día. Comprueba que guardaste el archivo."}
                </p>
              </div>
              <section className="panel backup">
                <ShieldCheck size={30} />
                <h2>Un respaldo, más tranquilidad</h2>
                <p>
                  Exporta todos tus movimientos, deudas y abonos a un archivo
                  JSON. Guárdalo en Archivos o en un lugar de confianza.
                </p>
                <button
                  className="button"
                  disabled={!loaded || busy}
                  onClick={() => void exportBackup()}
                >
                  <Download size={18} /> Exportar respaldo JSON
                </button>
                <div className="divider" />
                <h3>Restaurar tus datos</h3>
                <p>
                  La importación reemplaza los datos de este dispositivo.
                  Exporta primero tu respaldo actual. El archivo se valida antes
                  de guardar.
                </p>
                <label className="button secondary file-button">
                  <Upload size={18} /> Importar respaldo JSON
                  <input
                    type="file"
                    accept=".json,application/json"
                    disabled={!loaded || busy}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file) return;
                      try {
                        if (file.size > 10 * 1024 * 1024)
                          throw Error("El archivo supera el límite de 10 MB.");
                        const backup = validateBackup(
                          JSON.parse(await file.text()),
                        );
                        if (
                          confirm(
                            `¿Reemplazar todos los datos por ${backup.movements.length} movimientos, ${backup.debts.length} deudas, ${backup.budgets?.length ?? 0} presupuestos y ${backup.recurrents?.length ?? 0} recurrentes?`,
                          )
                        )
                          await mutate(() => backup);
                      } catch (err) {
                        setError(
                          err instanceof Error
                            ? err.message
                            : "No se pudo importar el respaldo.",
                        );
                      }
                    }}
                  />
                </label>
                <div className="divider" />
                <h3>Para tu hoja de cálculo</h3>
                <p>
                  Exporta todos tus movimientos en un archivo compatible con
                  Excel y Numbers.
                </p>
                <button
                  className="button secondary"
                  onClick={() =>
                    download(
                      csv(data.movements),
                      `movimientos-${today()}.csv`,
                      "text/csv;charset=utf-8",
                    )
                  }
                >
                  <Download size={18} /> Exportar movimientos CSV
                </button>
              </section>
              <section className="panel backup install">
                <span className="install-icon">
                  <Wallet size={28} />
                </span>
                <h2>Mi dinero, en tu iPhone</h2>
                <p>Ten tus finanzas a un toque de distancia.</p>
                <ol>
                  <li>
                    Abre la aplicación en <strong>Safari</strong>.
                  </li>
                  <li>
                    Toca el botón <strong>Compartir</strong>.
                  </li>
                  <li>
                    Selecciona <strong>Agregar a pantalla de inicio</strong> y
                    confirma en Agregar.
                  </li>
                  <li>
                    Abre Mi dinero y espera el aviso de que está lista sin
                    internet.
                  </li>
                </ol>
                <p className="helper">
                  La instalación requiere HTTPS (o localhost durante
                  desarrollo). Después de la primera carga completa, funciona
                  sin conexión.
                </p>
                <div className="local-note">
                  <ShieldCheck size={20} />
                  <p>
                    No sincronizamos ni enviamos tus datos. Si borras los datos
                    de Safari, cambias de dispositivo o desinstalas la app,
                    podrías perderlos. Haz respaldos frecuentes. El archivo JSON
                    contiene tus datos sin cifrar.
                  </p>
                </div>
              </section>
            </div>
          )}
        </div>
      </main>
      <nav className="mobile-nav" aria-label="Navegación principal">
        {tabs.map((t) => (
          <button
            className={tab === t.name ? "active" : ""}
            aria-current={tab === t.name ? "page" : undefined}
            key={t.name}
            onClick={() => setTab(t.name)}
          >
            <t.icon size={21} />
            <span>{t.name}</span>
          </button>
        ))}
      </nav>
      {modal && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget && !busy) setModal(null);
          }}
        >
          <section
            ref={modalRef}
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <div className="panel-heading">
              <h2 id="modal-title">
                {modal.kind === "movement"
                  ? modal.movement
                    ? "Editar movimiento"
                    : "Nuevo movimiento"
                  : modal.kind === "debt"
                    ? modal.debt
                      ? "Editar deuda"
                      : "Nueva deuda"
                    : `Abonar a ${modal.debt.creditor}`}
              </h2>
              <button
                aria-label="Cerrar formulario"
                onClick={() => setModal(null)}
                disabled={busy}
              >
                <X size={22} />
              </button>
            </div>
            <form
              onSubmit={saveForm}
              key={modal.kind === "movement" ? modal.movement?.id : modal.kind}
            >
              {modal.kind === "movement" && (
                <>
                  <Field label="Tipo">
                    <select
                      name="type"
                      value={movementType}
                      onChange={(e) =>
                        setMovementType(
                          e.target.value as
                            Movement["type"] | "credit" | "payment",
                        )
                      }
                    >
                      <option value="expense">Gasto</option>
                      <option value="income">Ingreso</option>
                      <option value="credit">Compra con TDC</option>
                      {!modal.movement && (
                        <option value="payment">Abono a deuda</option>
                      )}
                    </select>
                  </Field>
                  <div className="form-grid">
                    <Field label="Importe (MXN)">
                      <MoneyInput
                        autoFocus
                        name="amount"
                        type="number"
                        inputMode="decimal"
                        min="0.01"
                        max="999999999"
                        step="0.01"
                        required
                        defaultValue={modal.movement?.amount}
                      />
                    </Field>
                    <Field label="Fecha">
                      <DatePicker
                        name="date"
                        required
                        defaultValue={modal.movement?.date ?? today()}
                      />
                    </Field>
                  </div>
                  {movementType === "payment" ? (
                    <>
                      <Field label="Deuda a abonar">
                        <select name="debtId" required defaultValue="">
                          <option value="" disabled>
                            Selecciona una deuda pendiente
                          </option>
                          {data.debts
                            .filter((d) => balance(d) > 0)
                            .map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.creditor} · {money(balance(d))}
                              </option>
                            ))}
                        </select>
                      </Field>
                      <p className="helper">
                        El abono se registra como gasto mediante transferencia y
                        reduce la deuda en una sola operación. No lo registres
                        por separado.
                        {!data.debts.some((d) => balance(d) > 0) &&
                          " No hay deudas pendientes; registra primero una deuda."}
                      </p>
                    </>
                  ) : (
                    <>
                      <Field label="Establecimiento o concepto">
                        <input
                          name="merchant"
                          list="merchant-suggestions"
                          autoComplete="off"
                          required
                          maxLength={120}
                          defaultValue={modal.movement?.merchant}
                          placeholder="¿Dónde o de quién?"
                        />
                      </Field>
                      <div className="form-grid">
                        <Field label="Categoría">
                          <select
                            name="category"
                            defaultValue={
                              modal.movement?.category ?? categories[0]
                            }
                          >
                            {[
                              ...new Set([
                                ...categories,
                                ...(modal.movement
                                  ? [modal.movement.category]
                                  : []),
                              ]),
                            ].map((c) => (
                              <option key={c}>{c}</option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Método de pago">
                          <select
                            name="method"
                            value={
                              movementType === "credit"
                                ? "Tarjeta de crédito"
                                : movementMethod
                            }
                            onChange={(e) => {
                              setMovementMethod(e.target.value);
                              if (
                                movementType === "credit" &&
                                e.target.value !== "Tarjeta de crédito"
                              )
                                setMovementType("expense");
                            }}
                          >
                            {[
                              "Efectivo",
                              "Tarjeta de débito",
                              "Tarjeta de crédito",
                              "Transferencia",
                              "Otro",
                            ].map((c) => (
                              <option key={c}>{c}</option>
                            ))}
                          </select>
                        </Field>
                      </div>
                      {(movementType === "credit" ||
                        (movementType === "expense" &&
                          movementMethod === "Tarjeta de crédito")) && (
                        <>
                          <Field label="Tarjeta o deuda vinculada">
                            <select
                              name="creditDebtId"
                              required={
                                !!modal.movement?.creditDebtId ||
                                modal.movement?.method !==
                                  "Tarjeta de crédito" ||
                                modal.movement?.type !== "expense"
                              }
                              defaultValue={
                                modal.movement?.creditDebtId ??
                                (modal.movement?.method === "Tarjeta de crédito"
                                  ? ""
                                  : creditDebts.length === 1
                                    ? creditDebts[0].id
                                    : "")
                              }
                            >
                              <option
                                value=""
                                disabled={
                                  !!modal.movement?.creditDebtId ||
                                  modal.movement?.method !==
                                    "Tarjeta de crédito" ||
                                  modal.movement?.type !== "expense"
                                }
                              >
                                {modal.movement?.method ===
                                  "Tarjeta de crédito" &&
                                !modal.movement.creditDebtId
                                  ? "Mantener sin vincular (registro anterior)"
                                  : "Selecciona tu tarjeta de crédito"}
                              </option>
                              {creditDebts.map((d) => (
                                <option key={d.id} value={d.id}>
                                  {d.creditor} · {money(balance(d))}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <p className="helper">
                            La compra solo aumenta la deuda; no suma al gasto ni
                            reduce el saldo disponible. El gasto se registra al
                            abonar a la tarjeta. Los abonos anteriores se
                            conservan tal como fueron registrados.
                            {!creditDebts.length &&
                              " Primero registra tu tarjeta en Deudas → Nueva deuda (tipo Tarjeta de crédito); puedes iniciar con saldo cero."}
                          </p>
                        </>
                      )}
                      <Field label="Notas (opcional)">
                        <textarea
                          name="notes"
                          maxLength={2000}
                          defaultValue={modal.movement?.notes}
                          placeholder="Algo que quieras recordar"
                        />
                      </Field>
                    </>
                  )}
                </>
              )}
              {modal.kind === "debt" && (
                <>
                  <Field label="Tipo de deuda">
                    <select
                      value={debtKind}
                      disabled={!!modal.debt}
                      onChange={(e) => setDebtKind(e.target.value)}
                    >
                      <option value="normal">Otra deuda</option>
                      <option value="credit">Tarjeta de crédito</option>
                    </select>
                  </Field>
                  <Field label="Acreedor">
                    <input
                      autoFocus
                      name="creditor"
                      required
                      maxLength={120}
                      placeholder="Persona o establecimiento"
                      defaultValue={modal.debt?.creditor}
                    />
                  </Field>
                  <Field label="Importe original (MXN)">
                    <MoneyInput
                      name="original"
                      readOnly={!!modal.debt}
                      defaultValue={modal.debt?.original}
                      type="number"
                      min={debtKind === "credit" ? "0" : "0.01"}
                      max="999999999"
                      step="0.01"
                      inputMode="decimal"
                      required
                    />
                  </Field>
                  <Field label="Saldo pendiente actual (MXN)">
                    <MoneyInput
                      name="balance"
                      readOnly={!!modal.debt}
                      defaultValue={modal.debt?.initialBalance}
                      type="number"
                      min="0"
                      max="999999999"
                      step="0.01"
                      inputMode="decimal"
                      required
                    />
                  </Field>
                  <Field label="Fecha de vencimiento">
                    <DatePicker
                      name="due"
                      required
                      defaultValue={modal.debt?.due ?? today()}
                    />
                  </Field>
                  {debtKind === "credit" && (
                    <div className="form-grid">
                      <Field label="Día de corte (opcional)">
                        <input
                          name="cutDay"
                          type="number"
                          inputMode="numeric"
                          min="1"
                          max="31"
                          step="1"
                          defaultValue={modal.debt?.cutDay}
                        />
                      </Field>
                      <Field label="Día límite de pago (opcional)">
                        <input
                          name="paymentDay"
                          type="number"
                          inputMode="numeric"
                          min="1"
                          max="31"
                          step="1"
                          defaultValue={modal.debt?.paymentDay}
                        />
                      </Field>
                    </div>
                  )}
                  <Field label="Notas de deuda (opcional)">
                    <textarea
                      name="debtNotes"
                      maxLength={2000}
                      defaultValue={modal.debt?.notes}
                    />
                  </Field>
                  {modal.debt && (
                    <p className="helper">
                      Los importes de apertura no se editan para conservar el
                      historial. El saldo cambia con compras y abonos.
                    </p>
                  )}
                  <p className="helper">
                    El saldo actual permite registrar deudas que ya has empezado
                    a pagar. No se generarán gastos por pagos anteriores.{" "}
                    {debtKind === "credit" &&
                      "Si tu tarjeta no tiene adeudo, escribe 0 en ambos importes. Las compras nuevas se agregarán automáticamente al saldo al vincularlas."}
                  </p>
                </>
              )}
              {modal.kind === "payment" && (
                <>
                  <p>
                    Saldo pendiente:{" "}
                    <strong>{money(balance(modal.debt))}</strong>
                  </p>
                  <Field label="Importe del abono (MXN)">
                    <MoneyInput
                      autoFocus
                      name="amount"
                      type="number"
                      min="0.01"
                      max={balance(modal.debt)}
                      step="0.01"
                      inputMode="decimal"
                      required
                    />
                  </Field>
                  <Field label="Fecha del abono">
                    <DatePicker name="date" defaultValue={today()} required />
                  </Field>
                  <p className="helper">
                    {modal.debt.kind === "credit"
                      ? "Este abono reduce la deuda y se registra como gasto en la fecha del pago. Las compras vinculadas no cuentan como gasto."
                      : "Se registrará una sola vez como gasto en la categoría Pago de deuda."}{" "}
                    Se registra mediante transferencia. Para corregirlo,
                    revierte el abono y regístralo de nuevo.
                  </p>
                </>
              )}
              {error && (
                <p className="alert" role="alert">
                  {error}
                </p>
              )}
              <div className="form-buttons">
                <button
                  type="button"
                  className="button secondary"
                  disabled={busy}
                  onClick={() => setModal(null)}
                >
                  Cancelar
                </button>
                <button className="button" disabled={busy || !loaded}>
                  {busy ? "Guardando…" : "Guardar"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
