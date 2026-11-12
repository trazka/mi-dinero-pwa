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
} from "lucide-react";
import {
  balance,
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
type Tab = "Inicio" | "Movimientos" | "Deudas" | "Reportes" | "Respaldos";
type Modal =
  | { kind: "movement"; movement?: Movement }
  | { kind: "debt" }
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
  const modalRef = useRef<HTMLElement>(null);
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
  const [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [category, setCategory] = useState(""),
    [merchant, setMerchant] = useState(""),
    [period, setPeriod] = useState("monthly");
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
    const offline = () => setNotice("Aplicación lista para usar sin internet.");
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
    if (busy || !loaded) return;
    setBusy(true);
    setError("");
    try {
      setData(await changeData(fn));
      setModal(null);
      setNotice("Datos guardados en este dispositivo.");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "No se pudo guardar. Revisa el espacio disponible.",
      );
    } finally {
      setBusy(false);
    }
  }
  const incomes = data.movements
      .filter((m) => m.type === "income")
      .reduce((s, m) => s + m.amount, 0),
    expenses = data.movements
      .filter((m) => m.type === "expense")
      .reduce((s, m) => s + m.amount, 0),
    pending = data.debts.reduce((s, d) => s + balance(d), 0);
  const filtered = data.movements
    .filter(
      (m) =>
        (!from || m.date >= from) &&
        (!to || m.date <= to) &&
        (!category || m.category === category) &&
        m.merchant.toLocaleLowerCase().includes(merchant.toLocaleLowerCase()),
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
      const m: Movement = {
        id: modal.movement?.id ?? crypto.randomUUID(),
        type: get("type") as Movement["type"],
        date: get("date"),
        merchant: get("merchant"),
        category: get("category"),
        amount: num("amount"),
        method: get("method"),
        notes: get("notes"),
      };
      if (!cents(m.amount)) {
        setError("Introduce un importe válido con hasta dos decimales.");
        return;
      }
      void mutate((d) => ({
        ...d,
        movements: modal.movement
          ? d.movements.map((old) => (old.id === m.id ? m : old))
          : [...d.movements, m],
      }));
    }
    if (modal.kind === "debt") {
      const original = num("original"),
        initialBalance = num("balance");
      if (
        !cents(original) ||
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
            creditor: get("creditor"),
            original,
            initialBalance,
            due: get("due"),
            payments: [],
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
              {m.paymentId && (
                <small>Abono vinculado · elimina para revertir</small>
              )}
            </div>
            <div className="movement-right">
              <strong className={m.type === "income" ? "positive" : ""}>
                {m.type === "income" ? "+" : "−"}
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
    group[m.type === "income" ? "income" : "expense"] += m.amount;
    groupTotals.set(key, group);
  }
  const filters = (
    <div className="filters">
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
          <span>FINANZAS PERSONALES</span>
          <div>
            <span className="local-badge">
              <b /> Privado y local
            </span>
            <span className="avatar">M</span>
          </div>
        </header>
        <div className="page">
          <div className="page-heading">
            <div>
              <p className="eyebrow">TU DINERO, CON CLARIDAD</p>
              <h1>
                {tab === "Inicio"
                  ? "Un poco de orden, mucha tranquilidad."
                  : tab}
              </h1>
              <p>
                {tab === "Inicio"
                  ? "Cada pequeño paso cuenta. Así van tus finanzas."
                  : (
                      {
                        Movimientos: "Cada ingreso y gasto, en un solo lugar.",
                        Deudas: "Un paso más cerca de estar al día.",
                        Reportes: "Entiende a dónde va tu dinero.",
                        Respaldos: "Cuida lo que llevas registrado.",
                      } as Record<string, string>
                    )[tab]}
              </p>
            </div>
            {tab !== "Respaldos" && (
              <button
                className="button"
                disabled={!loaded}
                onClick={() => {
                  setError("");
                  setModal(
                    tab === "Deudas" ? { kind: "debt" } : { kind: "movement" },
                  );
                }}
              >
                <Plus size={18} />
                {tab === "Deudas" ? "Nueva deuda" : "Nuevo movimiento"}
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
                {modal
                  ? " Guarda o cierra el formulario antes de actualizar."
                  : ""}
              </span>
              <button
                className="button secondary"
                disabled={!!modal || busy || updating || !loaded}
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
                  <small>Incluye abonos a deudas</small>
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
                Registrar una deuda no genera un gasto. Cada abono crea un único
                gasto vinculado; no lo registres de nuevo en Movimientos.
              </p>
              <div className="debt-grid">
                {data.debts.map((d) => (
                  <section className="panel debt-detail" key={d.id}>
                    <div className="panel-heading">
                      <h2>{d.creditor}</h2>
                      <span
                        className={"pill " + (balance(d) === 0 ? "paid" : "")}
                      >
                        {balance(d) === 0
                          ? "Liquidada"
                          : d.due < today()
                            ? "Vencida"
                            : "Pendiente"}
                      </span>
                    </div>
                    <p>Saldo pendiente</p>
                    <strong className="debt-number">{money(balance(d))}</strong>
                    <progress
                      value={d.original - balance(d)}
                      max={d.original}
                    />
                    <div className="debt-meta">
                      <span>Original: {money(d.original)}</span>
                      <span>
                        Vence: {dateLabel(d.due)} {d.due.slice(0, 4)}
                      </span>
                    </div>
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
                ))}
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
          {tab === "Reportes" && (
            <section className="panel full-panel">
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
                    {money(
                      filtered
                        .filter((m) => m.type === "expense")
                        .reduce((s, m) => s + m.amount, 0),
                    )}
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
              <section className="panel backup">
                <ShieldCheck size={30} />
                <h2>Un respaldo, más tranquilidad</h2>
                <p>
                  Exporta todos tus movimientos, deudas y abonos a un archivo
                  JSON. Guárdalo en Archivos o en un lugar de confianza.
                </p>
                <button
                  className="button"
                  disabled={!loaded}
                  onClick={() =>
                    download(
                      JSON.stringify(data, null, 2),
                      `mi-dinero-${today()}.json`,
                      "application/json",
                    )
                  }
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
                            `¿Reemplazar todos los datos por ${backup.movements.length} movimientos y ${backup.debts.length} deudas?`,
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
                    ? "Nueva deuda"
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
                      defaultValue={modal.movement?.type ?? "expense"}
                    >
                      <option value="expense">Gasto</option>
                      <option value="income">Ingreso</option>
                    </select>
                  </Field>
                  <div className="form-grid">
                    <Field label="Importe (MXN)">
                      <input
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
                  <Field label="Establecimiento o concepto">
                    <input
                      name="merchant"
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
                        defaultValue={modal.movement?.category ?? categories[0]}
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
                        defaultValue={modal.movement?.method ?? "Efectivo"}
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
              {modal.kind === "debt" && (
                <>
                  <Field label="Acreedor">
                    <input
                      autoFocus
                      name="creditor"
                      required
                      maxLength={120}
                      placeholder="Persona o establecimiento"
                    />
                  </Field>
                  <Field label="Importe original (MXN)">
                    <input
                      name="original"
                      type="number"
                      min="0.01"
                      max="999999999"
                      step="0.01"
                      inputMode="decimal"
                      required
                    />
                  </Field>
                  <Field label="Saldo pendiente actual (MXN)">
                    <input
                      name="balance"
                      type="number"
                      min="0"
                      max="999999999"
                      step="0.01"
                      inputMode="decimal"
                      required
                    />
                  </Field>
                  <Field label="Fecha de vencimiento">
                    <DatePicker name="due" required defaultValue={today()} />
                  </Field>
                  <p className="helper">
                    El saldo actual permite registrar deudas que ya has empezado
                    a pagar. No se generarán gastos por pagos anteriores.
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
                    <input
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
                    Se registrará una sola vez como gasto en la categoría Pago
                    de deuda, mediante transferencia. Para corregirlo, revierte
                    el abono y regístralo de nuevo.
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
