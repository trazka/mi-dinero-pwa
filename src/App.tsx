import { useRevealExpanded } from "./useRevealExpanded";
import EditIcon from "./EditIcon";
import MsiFields from "./MsiFields";
import MsiProjection from "./MsiProjection";
import {
  groupReport,
  reportFree,
  reportUsed,
  type ReportGroup,
} from "./reports";
import { usePageSwipe } from "./usePageSwipe";
import { flushSync } from "react-dom";
import { recordMovement, recordPayment, recordSaving } from "./pending";
import { PendingPanel } from "./PendingPanel";
import HomeLanding from "./HomeLanding";
import useTimedMessage from "./useTimedMessage";
import {
  excelBlob,
  exportDate,
  pdfBlob,
  movementExport,
  saveExport,
  type ExportTable,
} from "./exports";
import { categoryForConcept } from "./concepts";
import ConceptInput from "./ConceptInput";
import SavingsPanel from "./SavingsPanel";
import { freeAmount } from "./savings";
import { SecurityPanel, useSecurity } from "./SecurityGate";
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
  Trash2,
  Wallet,
  ChevronRight,
  PiggyBank,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  balance,
  expenseAmount,
  availableWalletBalances,
  walletNames,
  type WalletKey,
  transferRoute,
  cents,
  changeData,
  csv,
  empty,
  money,
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
type MovementFilter = "all" | "income" | "expense" | "credit" | "transfer";
const acquiredDebtAmount = (movement: Movement) =>
  movement.creditDebtId ? movement.amount : 0;
type Modal =
  | {
      kind: "movement";
      movement?: Movement;
      initialType?: "saving" | "payment";
    }
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
function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={`field ${className}`}>
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
function ExportButtons({
  onExport,
  disabled,
}: {
  onExport: (format: "xlsx" | "pdf") => void;
  disabled: boolean;
}) {
  return (
    <div className="export-actions" aria-label="Exportar listado">
      <button
        className="button secondary"
        disabled={disabled}
        onClick={() => onExport("xlsx")}
      >
        <Download size={16} /> Excel
      </button>
      <button
        className="button secondary"
        disabled={disabled}
        onClick={() => onExport("pdf")}
      >
        <Download size={16} /> PDF
      </button>
    </div>
  );
}
export default function App() {
  const security = useSecurity();
  const [exporting, setExporting] = useState(false);
  async function exportReadable(
    table: ExportTable,
    filename: string,
    format: "xlsx" | "pdf",
  ) {
    if (exporting) return;
    setExporting(true);
    setError("");
    try {
      const blob = await (format === "xlsx"
        ? excelBlob(table)
        : pdfBlob(table));
      saveExport(blob, `${filename}-${today()}.${format}`);
      setNotice(
        "Archivo generado. Puedes abrirlo o guardarlo desde las descargas.",
      );
    } catch {
      setError("No se pudo generar el archivo. Vuelve a intentarlo.");
    } finally {
      setExporting(false);
    }
  }

  const [savingsVisible, setSavingsVisible] = useState(false);
  const [homeSummaryVisible, setHomeSummaryVisible] = useState(false);
  const canSeeSavings = savingsVisible;
  useEffect(() => {
    const hide = () => {
      if (document.hidden) {
        setSavingsVisible(false);
        setHomeSummaryVisible(false);
      }
    };
    const pageHide = () => {
      setSavingsVisible(false);
      setHomeSummaryVisible(false);
    };
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("pagehide", pageHide);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("pagehide", pageHide);
    };
  }, []);
  const savingsPrivacy = (
    <div className="savings-privacy">
      <button
        type="button"
        className="savings-eye"
        title={canSeeSavings ? "Ocultar ahorros" : "Mostrar ahorros"}
        aria-label={canSeeSavings ? "Ocultar ahorros" : "Mostrar ahorros"}
        aria-pressed={canSeeSavings}
        onClick={() => setSavingsVisible((visible) => !visible)}
      >
        {canSeeSavings ? <EyeOff size={28} /> : <Eye size={28} />}
      </button>
    </div>
  );

  const [data, setData] = useState<Data>(empty),
    [loaded, setLoaded] = useState(false),
    [tab, setTab] = useState<Tab>("Inicio"),
    [modal, setModal] = useState<Modal>(null),
    [busy, setBusy] = useState(false);
  const [error, setError] = useTimedMessage(6000, loaded);
  const [notice, setNotice] = useTimedMessage(4000);
  useEffect(() => {
    setError("");
    setNotice("");
  }, [tab, setError, setNotice]);
  const [updateAvailable, setUpdateAvailable] = useState(
    !!window.__miDineroUpdate,
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  useEffect(() => {
    const landscape = window.matchMedia(
      "(min-width: 801px) and (orientation: landscape)",
    );
    const enterLandscape = () => {
      if (landscape.matches) setSidebarCollapsed(true);
    };
    landscape.addEventListener("change", enterLandscape);
    return () => landscape.removeEventListener("change", enterLandscape);
  }, []);
  const [updating, setUpdating] = useState(false);
  const [savingCreating, setSavingCreating] = useState(false);
  const [planningEditing, setPlanningEditing] = useState(false);
  const [movementType, setMovementType] = useState<
    Movement["type"] | "credit" | "payment" | "saving"
  >("expense");
  const [movementCategory, setMovementCategory] = useState<string>(
    categories[0],
  );
  const [movementMethod, setMovementMethod] = useState("Efectivo");
  const [movementDate, setMovementDate] = useState(today());
  const [movementAmount, setMovementAmount] = useState(0);
  const [creditCardId, setCreditCardId] = useState("");
  const [currentDay, setCurrentDay] = useState(today());
  useEffect(() => {
    const refresh = () => setCurrentDay(today());
    const interval = window.setInterval(refresh, 60000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  const duePending = (data.pendingMovements ?? []).filter(
    (p) => p.date <= currentDay,
  ).length;
  const [transferDirection, setTransferDirection] =
    useState<NonNullable<Movement["transferDirection"]>>("bank-to-cash");
  const [debtKind, setDebtKind] = useState("normal");
  useEffect(() => {
    if (modal?.kind === "movement") {
      setMovementDate(modal.movement?.date ?? today());
      setMovementAmount(modal.movement?.amount ?? 0);
      setCreditCardId(
        modal.movement?.creditDebtId ??
          (modal.movement?.method === "Tarjeta de crédito"
            ? ""
            : creditDebts.length === 1
              ? creditDebts[0].id
              : ""),
      );
      setMovementType(
        modal.movement?.creditDebtId
          ? "credit"
          : (modal.movement?.type ?? modal.initialType ?? "expense"),
      );
      setMovementMethod(modal.movement?.method ?? "Efectivo");
      setTransferDirection(modal.movement?.transferDirection ?? "bank-to-cash");
      setMovementCategory(modal.movement?.category ?? categories[0]);
    }
    if (modal?.kind === "payment") setMovementDate(today());
    if (modal?.kind === "debt") setDebtKind(modal.debt?.kind ?? "normal");
  }, [modal]);
  const modalRef = useRef<HTMLElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  useRevealExpanded(pageRef, loaded);
  const previewFrameRef = useRef<HTMLDivElement>(null);
  const previewContentRef = useRef<HTMLDivElement>(null);
  const [previewTab, setPreviewTab] = useState<Tab | null>(null);
  const [navigationTarget, setNavigationTarget] = useState<Tab | null>(null);
  const navigationTab = navigationTarget ?? tab;
  const { cancel: cancelPageSwipe, goTo: animateNavigation } = usePageSwipe({
    pageRef,
    previewFrameRef,
    previewContentRef,
    tab,
    tabs: tabs.map((item) => item.name),
    blocked: !!modal || planningEditing || !loaded || busy,
    prepare: (next) => flushSync(() => setPreviewTab(next)),
    confirm: (next) =>
      flushSync(() => {
        setNavigationTarget(next);
        if (tab === "Movimientos" && next !== "Movimientos")
          setMovementListVisible(false);
      }),
    clear: () => {
      setPreviewTab(null);
      setNavigationTarget(null);
    },
    commit: (next) =>
      flushSync(() => {
        setPreviewTab(null);
        commitNavigation(next);
      }),
  });
  function navigate(section: Tab) {
    if (section !== tab) {
      setHomeSummaryVisible(false);
      if (tab === "Apartados") {
        setSavingsVisible(false);
        setSavingCreating(false);
      }
    }
    if (animateNavigation(section)) return;
    cancelPageSwipe();
    commitNavigation(section);
  }
  function commitNavigation(section: Tab) {
    setNavigationTarget(null);
    if (tab === "Movimientos" && section !== "Movimientos")
      setMovementListVisible(false);
    setHomeSummaryVisible(false);
    if (section === "Reportes" && typeFilter === "transfer")
      setTypeFilter("all");
    setTab(section);
    pageRef.current?.scrollTo({ top: 0 });
  }
  const merchantOptions = [
    ...new Set([
      ...data.movements
        .filter((m) => m.type !== "transfer")
        .map((m) => m.merchant),
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
    let resumeTimer = 0;
    let settleTimer = 0;
    let viewportWidth = window.innerWidth;
    let fullHeight = window.innerHeight;
    const resize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (document.hidden) return;
        const viewport = window.visualViewport;
        const active = document.activeElement as HTMLElement | null;
        const editing = !!active?.matches(
          'textarea, input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="button"]):not([type="submit"]):not([type="range"]):not([type="color"]), select',
        );
        // Safari can retain landscape visual-viewport dimensions while its
        // layout and touch coordinates have already returned to portrait.
        // Only use it for a focused field when its width matches the layout.
        const matchingViewport =
          !viewport || Math.abs(viewport.width - window.innerWidth) < 2;
        const height =
          editing && matchingViewport
            ? (viewport?.height ?? window.innerHeight)
            : window.innerHeight;
        if (height <= 0) return;
        if (
          mobile.matches &&
          !editing &&
          (viewport?.scale ?? 1) === 1 &&
          window.scrollY !== 0
        )
          window.scrollTo(0, 0);
        if (window.innerWidth !== viewportWidth) {
          viewportWidth = window.innerWidth;
          fullHeight = window.innerHeight;
        }
        fullHeight = Math.max(fullHeight, window.innerHeight, height);
        const keyboardOpen = editing && fullHeight - height > 120;
        document.documentElement.toggleAttribute("data-field-focused", editing);
        document.documentElement.toggleAttribute(
          "data-input-active",
          keyboardOpen,
        );
        document.documentElement.style.setProperty(
          "--app-height",
          `${height}px`,
        );
        document.documentElement.style.setProperty(
          "--app-top",
          `${editing && matchingViewport ? (viewport?.offsetTop ?? 0) : 0}px`,
        );
        if (mobile.matches && editing && active) {
          const scroller = active.closest<HTMLElement>(".modal, .page");
          if (scroller) {
            const field = active.getBoundingClientRect();
            const container = scroller.getBoundingClientRect();
            if (field.bottom > container.bottom - 16)
              scroller.scrollTop += field.bottom - container.bottom + 16;
            else if (field.top < container.top + 16)
              scroller.scrollTop -= container.top + 16 - field.top;
          }
        }
      });
    };
    const resetDocument = () => {
      resize();
      if (mobile.matches) window.scrollTo(0, 0);
    };
    const resume = () => {
      if (document.hidden) return;
      resetDocument();
      // Rotation/foreground events can arrive before Safari finishes updating
      // the layout and document offset. Recover again after those transitions.
      window.clearTimeout(resumeTimer);
      window.clearTimeout(settleTimer);
      resumeTimer = window.setTimeout(resetDocument, 150);
      settleTimer = window.setTimeout(resetDocument, 500);
    };
    const layoutChanges = new MutationObserver(() => {
      if (
        document.documentElement.hasAttribute("data-input-active") ||
        document.documentElement.hasAttribute("data-field-focused")
      )
        resize();
    });
    const app = pageRef.current?.closest(".app");
    if (app) layoutChanges.observe(app, { childList: true, subtree: true });
    resize();
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("pageshow", resume);
    window.addEventListener("focus", resume);
    mobile.addEventListener("change", resume);
    window.addEventListener("orientationchange", resume);
    window.screen.orientation?.addEventListener("change", resume);
    window.addEventListener("resize", resize);
    window.visualViewport?.addEventListener("resize", resize);
    window.visualViewport?.addEventListener("scroll", resize);
    document.addEventListener("focusin", resize);
    document.addEventListener("focusout", resize);
    return () => {
      cancelAnimationFrame(frame);
      layoutChanges.disconnect();
      window.clearTimeout(resumeTimer);
      window.clearTimeout(settleTimer);
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("pageshow", resume);
      window.removeEventListener("focus", resume);
      mobile.removeEventListener("change", resume);
      window.removeEventListener("orientationchange", resume);
      window.screen.orientation?.removeEventListener("change", resume);
      window.removeEventListener("resize", resize);
      window.visualViewport?.removeEventListener("resize", resize);
      window.visualViewport?.removeEventListener("scroll", resize);
      document.removeEventListener("focusin", resize);
      document.removeEventListener("focusout", resize);
      document.documentElement.removeAttribute("data-input-active");
      document.documentElement.removeAttribute("data-field-focused");
      document.documentElement.style.removeProperty("--app-top");
      document.documentElement.style.removeProperty("--app-height");
    };
  }, []);
  const [typeFilter, setTypeFilter] = useState<MovementFilter>("all");
  const [movementListVisible, setMovementListVisible] = useState(false);
  const [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [category, setCategory] = useState(""),
    [period, setPeriod] = useState("monthly");
  const [search, setSearch] = useState(""),
    [methodFilter, setMethodFilter] = useState(""),
    [debtFilter, setDebtFilter] = useState("");
  function clearFilters() {
    if (tab === "Reportes") setTypeFilter("all");
    setSearch("");
    setMethodFilter("");
    setDebtFilter("");
    setFrom("");
    setTo("");
    setCategory("");
  }
  function selectMovementType(type: MovementFilter) {
    setMovementListVisible(true);
    setTypeFilter(type);
    setSearch("");
    setMethodFilter("");
    setDebtFilter("");
    setCategory("");
  }
  function showMovements(type: MovementFilter) {
    setMovementListVisible(true);
    clearFilters();
    setTypeFilter(type);
    navigate("Movimientos");
  }
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
    if (tab !== "Apartados") {
      setSavingCreating(false);
      setSavingsVisible(false);
    }
  }, [tab]);
  const creditDebts = data.debts.filter((d) => d.kind === "credit");
  const cardPaymentIds = new Set(
    creditDebts.flatMap((debt) =>
      debt.payments.map((payment) => payment.movementId),
    ),
  );
  const cardPaymentAmount = (movement: Movement) =>
    movement.paymentId && cardPaymentIds.has(movement.id) ? movement.amount : 0;

  // Reverse registration order first; stable date sorting keeps the latest
  // registered movement first when several share the same date.
  const newestFirst = [...data.movements]
    .reverse()
    .sort((a, b) => b.date.localeCompare(a.date));
  const wallets = availableWalletBalances(data);
  const transferSourceWallets =
    modal?.kind === "movement" && modal.movement
      ? availableWalletBalances({
          ...data,
          movements: data.movements.filter((m) => m.id !== modal.movement?.id),
        })
      : wallets;
  function saveForm(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget),
      get = (n: string) => String(form.get(n) ?? "").trim(),
      num = (n: string) => Number(get(n));
    if (!modal) return;
    if (modal.kind === "movement") {
      if (movementType === "saving") {
        void mutate((d) =>
          recordSaving(
            d,
            get("savingId"),
            num("amount"),
            get("date"),
            get("savingWallet") as WalletKey,
          ),
        );
        return;
      }
      if (movementType === "payment") {
        void mutate((d) =>
          recordPayment(d, get("debtId"), num("amount"), get("date")),
        );
        return;
      }
      if (movementType === "transfer") {
        const direction = get(
          "transferDirection",
        ) as Movement["transferDirection"];
        const route =
          direction === "bank-to-cash"
            ? "Retiro a efectivo"
            : "Depósito al banco";
        void mutate((d) =>
          recordMovement(d, {
            id: modal.movement?.id ?? crypto.randomUUID(),
            type: "transfer",
            date: get("date"),
            amount: num("amount"),
            merchant: get("transferConcept") || route,
            category: "Traspaso",
            method:
              direction === "bank-to-cash"
                ? "Banco → Efectivo"
                : "Efectivo → Banco",
            notes: get("notes"),
            transferDirection: direction,
          }),
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
      if (m.type === "expense" && m.method === "Tarjeta de crédito") {
        m.creditDebtId = get("creditDebtId");
        if (get("msiEnabled"))
          m.msi = { months: num("msiMonths"), firstCut: get("msiFirstCut") };
      }
      void mutate((d) => recordMovement(d, m));
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
      void mutate((d) =>
        recordPayment(d, modal.debt.id, num("amount"), get("date")),
      );
  }
  function renderPageContent(tab: Tab, selectedType = typeFilter) {
    const typeFilter =
      tab === "Reportes" && selectedType === "transfer" ? "all" : selectedType;
    const tdcView = tab === "Movimientos" && typeFilter === "credit";
    const typeMovements = newestFirst.filter(
      (m) =>
        !(tab === "Reportes" && m.type === "transfer") &&
        (typeFilter === "all" ||
          (typeFilter === "income"
            ? m.type === "income"
            : typeFilter === "transfer"
              ? m.type === "transfer"
              : typeFilter === "credit"
                ? acquiredDebtAmount(m) > 0 ||
                  (tdcView && cardPaymentAmount(m) > 0)
                : expenseAmount(m) > 0)),
    );
    const activeFilters = [
      { name: "Búsqueda", value: search.trim(), clear: () => setSearch("") },
      { name: "Método", value: methodFilter, clear: () => setMethodFilter("") },
      {
        name: "Tarjeta o deuda",
        value: debtFilter
          ? (data.debts.find((d) => d.id === debtFilter)?.creditor ??
            debtFilter)
          : "",
        clear: () => setDebtFilter(""),
      },
      { name: "Categoría", value: category, clear: () => setCategory("") },
    ].filter((f) => f.value);
    const generalReport = typeFilter === "all" && activeFilters.length === 0;
    const filtered = typeMovements.filter(
      (m) =>
        (!from || m.date >= from) &&
        (!to || m.date <= to) &&
        (!category || m.category === category) &&
        matchesSearch(m, search) &&
        (!methodFilter || m.method === methodFilter) &&
        (!debtFilter || movementDebtId(data, m) === debtFilter),
    );
    const reportColumns = (
      [
        {
          key: "income",
          label: "Ingresos",
          summary: "Ingresos filtrados",
          total: filtered
            .filter((m) => m.type === "income")
            .reduce((total, m) => total + m.amount, 0),
        },
        {
          key: "expense",
          label: "Egresos",
          summary: "Egresos filtrados",
          total: filtered.reduce((total, m) => total + expenseAmount(m), 0),
        },
        {
          key: "acquired",
          label: "Deuda adquirida",
          summary: "Deuda adquirida",
          total: filtered.reduce(
            (total, m) => total + acquiredDebtAmount(m),
            0,
          ),
        },
      ] as const
    ).filter((column) => column.total > 0);
    const hasSavingActivity =
      generalReport &&
      (data.savings ?? []).some((s) =>
        s.entries.some(
          (e) => (!from || e.date >= from) && (!to || e.date <= to),
        ),
      );
    const showBalance =
      generalReport &&
      (hasSavingActivity ||
        reportColumns.some(
          (column) => column.key === "income" || column.key === "expense",
        ));
    const recent = newestFirst.slice(0, 5);
    const acquired = data.movements.reduce(
      (total, m) => total + acquiredDebtAmount(m),
      0,
    );
    const typeLabels = {
      all: ["movimiento", "movimientos"],
      income: ["ingreso", "ingresos"],
      expense: ["gasto", "gastos"],
      credit: ["movimiento TDC", "movimientos TDC"],
      transfer: ["traspaso", "traspasos"],
    };
    const filteredCardPayments = filtered.reduce(
      (total, m) => total + cardPaymentAmount(m),
      0,
    );
    const filteredLabel = typeLabels[typeFilter][filtered.length === 1 ? 0 : 1];
    const filteredTotal = filtered.reduce(
      (total, m) =>
        total +
        (typeFilter === "income" || typeFilter === "transfer"
          ? m.amount
          : typeFilter === "credit"
            ? acquiredDebtAmount(m)
            : expenseAmount(m)),
      0,
    );

    function movementList(items: Movement[]) {
      return items.length ? (
        <div className="movement-list">
          {items.map((m) => (
            <article className="movement" key={m.id}>
              <div
                className={
                  "movement-icon " +
                  (tdcView && cardPaymentAmount(m) > 0 ? "income" : m.type)
                }
              >
                {m.type === "transfer" ? (
                  <ArrowLeftRight size={20} />
                ) : m.type === "income" ||
                  (tdcView && cardPaymentAmount(m) > 0) ? (
                  <ArrowDownLeft size={20} />
                ) : (
                  <ArrowUpRight size={20} />
                )}
              </div>
              <div className="movement-info">
                {tdcView && m.creditDebtId && (
                  <small className="tdc-entry-kind charge">Compra</small>
                )}
                <strong>
                  {cardPaymentAmount(m) > 0
                    ? `Abono · ${m.merchant}`
                    : m.merchant}
                </strong>
                {m.type === "transfer" ? (
                  <small>
                    {dateLabel(m.date)} · {transferRoute(m).from} →{" "}
                    {transferRoute(m).to}
                    {m.notes ? ` · ${m.notes}` : ""}
                  </small>
                ) : cardPaymentAmount(m) > 0 ? (
                  <small>
                    {dateLabel(m.date)} <span>·</span> {m.method}
                    {m.notes && m.notes !== "Abono vinculado a deuda"
                      ? ` · ${m.notes}`
                      : ""}
                  </small>
                ) : (
                  <>
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
                        {
                          data.debts.find((d) => d.id === m.creditDebtId)
                            ?.creditor
                        }
                      </small>
                    )}
                    {m.paymentId && (
                      <small>Abono vinculado · elimina para revertir</small>
                    )}
                  </>
                )}
                {m.msi && (
                  <small>
                    {m.msi.months} MSI · Primer corte:{" "}
                    {exportDate(m.msi.firstCut)}
                  </small>
                )}
              </div>
              <div className="movement-right">
                <strong
                  className={
                    m.type === "income" || (tdcView && cardPaymentAmount(m) > 0)
                      ? "positive"
                      : ""
                  }
                >
                  {m.type === "transfer"
                    ? ""
                    : m.type === "income"
                      ? "+"
                      : m.creditDebtId
                        ? tdcView
                          ? "+"
                          : ""
                        : "−"}
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
                      <EditIcon />
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
          <h3>
            {data.movements.length
              ? `No hay ${filteredLabel} con estos filtros`
              : "Tu historia financiera empieza aquí"}
          </h3>
          <p>
            {data.movements.length
              ? "Cambia las fechas o limpia los filtros para ver tus registros."
              : "Registra un movimiento para comenzar a ver tus finanzas con claridad."}
          </p>
          {!data.movements.length && (
            <button
              className="button secondary"
              onClick={() => setModal({ kind: "movement" })}
            >
              Registrar movimiento
            </button>
          )}
        </div>
      );
    }
    const groupTotals = groupReport(
      filtered,
      generalReport ? (data.savings ?? []) : [],
      period,
      from,
      to,
    );
    const exportNames = {
      all: "movimientos",
      income: "ingresos",
      expense: "gastos",
      credit: tdcView ? "tdc" : "deuda-adquirida",
      transfer: "traspasos",
    };
    const exportTitles = {
      all: "Todos los movimientos",
      income: "Ingresos",
      expense: "Gastos",
      credit: tdcView ? "TDC: compras y abonos" : "Deuda adquirida",
      transfer: "Traspasos entre banco y efectivo",
    };
    const exportFilters = [
      `Desde: ${from ? exportDate(from) : "sin límite"} · Hasta: ${to ? exportDate(to) : "sin límite"}`,
      search && `Búsqueda: ${search}`,
      methodFilter && `Método: ${methodFilter}`,
      debtFilter &&
        `Tarjeta o deuda: ${data.debts.find((d) => d.id === debtFilter)?.creditor ?? debtFilter}`,
      category && `Categoría: ${category}`,
    ].filter(Boolean) as string[];
    const normalizeExports = (items: Movement[]) =>
      items.map((m) =>
        cardPaymentAmount(m) > 0
          ? {
              ...m,
              creditPaymentDebtId:
                m.creditPaymentDebtId ?? movementDebtId(data, m),
            }
          : m,
      );
    const movementDocument = movementExport(
      normalizeExports(filtered),
      exportTitles[typeFilter],
      exportFilters,
      tdcView,
    );
    const rangeDate = (iso: string, includeYear = true) =>
      new Date(iso + "T12:00:00").toLocaleDateString("es-MX", {
        day: "numeric",
        month: "short",
        ...(includeYear ? { year: "numeric" as const } : {}),
      });
    const reportRange =
      from && to
        ? from === to
          ? rangeDate(from)
          : `${rangeDate(from, from.slice(0, 4) !== to.slice(0, 4))} – ${rangeDate(to)}`
        : from
          ? `Desde el ${rangeDate(from)}`
          : to
            ? `Hasta el ${rangeDate(to)}`
            : "Todo el historial";
    const periodLabel = (key: string) => {
      if (period !== "monthly")
        return `${period === "weekly" ? "Semana del " : ""}${exportDate(key)}`;
      const label = new Date(key + "-01T12:00:00")
        .toLocaleDateString("es-MX", { month: "long", year: "numeric" })
        .replace(" de ", " ");
      return label.charAt(0).toUpperCase() + label.slice(1);
    };
    const reportFields: {
      key: string;
      label: string;
      value: (g: ReportGroup) => number;
    }[] = reportColumns.map((column) => ({
      key: column.key,
      label:
        column.key === "expense"
          ? generalReport
            ? "Utilizado"
            : "Gastos"
          : column.label,
      value:
        column.key === "expense" && generalReport
          ? reportUsed
          : (g: ReportGroup) => g[column.key],
    }));
    if (hasSavingActivity && !reportFields.some((f) => f.key === "expense")) {
      const index = reportFields.some((f) => f.key === "income") ? 1 : 0;
      reportFields.splice(index, 0, {
        key: "expense",
        label: "Utilizado",
        value: reportUsed,
      });
    }
    if (showBalance)
      reportFields.push({
        key: "free",
        label: "Disponible",
        value: reportFree,
      });
    const reportDocument: ExportTable = {
      title: `Reporte: ${exportTitles[typeFilter]}`,
      filters: [
        ...exportFilters,
        `Agrupado por: ${period === "monthly" ? "mes" : period === "weekly" ? "semana" : "día"}`,
      ],
      totals: reportFields.map((f) => [
        f.label,
        [...groupTotals.values()].reduce((sum, g) => sum + f.value(g), 0),
      ]),
      columns: ["Periodo", ...reportFields.map((f) => f.label)],
      rows: [...groupTotals]
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([key, g]) => [
          periodLabel(key),
          ...reportFields.map((f) => f.value(g)),
        ]),
      moneyColumns: reportFields.map((_, i) => i + 1),
    };
    const filters = (
      <div className="filters">
        {tab === "Reportes" && (
          <Field label="Tipo de movimiento">
            <select
              value={typeFilter}
              onChange={(e) =>
                selectMovementType(e.target.value as MovementFilter)
              }
            >
              <option value="all">Todos los movimientos</option>
              <option value="income">Solo ingresos</option>
              <option value="expense">Solo egresos</option>
              <option value="credit">Deuda adquirida (TDC)</option>
            </select>
          </Field>
        )}
        <Field label="Desde" className="date-filter">
          <DatePicker value={from} onChange={setFrom} />
        </Field>
        <Field label="Hasta" className="date-filter">
          <DatePicker value={to} min={from || undefined} onChange={setTo} />
        </Field>
        {tab === "Reportes" && (
          <Field label="Agrupar por" className="group-filter">
            <select value={period} onChange={(e) => setPeriod(e.target.value)}>
              <option value="daily">Día</option>
              <option value="weekly">Semana (lunes a domingo)</option>
              <option value="monthly">Mes</option>
            </select>
          </Field>
        )}
        <details className="advanced-filters">
          <summary>
            <span>Más filtros</span>
            <ChevronRight size={18} aria-hidden="true" />
          </summary>
          <div className="advanced-filter-fields">
            {tab === "Reportes" && (
              <Field label="Buscar movimientos">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Concepto, notas o importe"
                />
              </Field>
            )}
            {!(tab === "Reportes" && typeFilter === "credit") && (
              <Field label="Filtrar método">
                <select
                  value={methodFilter}
                  onChange={(e) => setMethodFilter(e.target.value)}
                >
                  <option value="">Todos los métodos</option>
                  {[
                    ...new Set(
                      typeFilter === "credit" || typeFilter === "transfer"
                        ? typeMovements.map((m) => m.method)
                        : [
                            "Efectivo",
                            "Tarjeta de débito",
                            ...(typeFilter === "all"
                              ? ["Tarjeta de crédito"]
                              : []),
                            "Transferencia",
                            "Otro",
                            ...typeMovements.map((m) => m.method),
                          ],
                    ),
                  ].map((method) => (
                    <option key={method}>{method}</option>
                  ))}
                </select>
              </Field>
            )}
            {typeFilter !== "income" && typeFilter !== "transfer" && (
              <Field
                label={
                  typeFilter === "credit"
                    ? "Filtrar tarjeta"
                    : "Filtrar tarjeta o deuda"
                }
              >
                <select
                  value={debtFilter}
                  onChange={(e) => setDebtFilter(e.target.value)}
                >
                  <option value="">
                    {typeFilter === "credit"
                      ? "Todas las tarjetas"
                      : "Todas las deudas"}
                  </option>
                  {data.debts
                    .filter(
                      (d) => typeFilter !== "credit" || d.kind === "credit",
                    )
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.creditor}
                      </option>
                    ))}
                </select>
              </Field>
            )}
            <Field label="Categoría">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">Todas las categorías</option>
                {[...new Set([...typeMovements.map((m) => m.category)])].map(
                  (c) => (
                    <option key={c}>{c}</option>
                  ),
                )}
              </select>
            </Field>
          </div>
        </details>
        {activeFilters.length > 0 && (
          <ul className="active-filters" aria-label="Filtros activos">
            {activeFilters.map((filter) => (
              <li key={filter.name}>
                <button
                  type="button"
                  aria-label={`Quitar filtro ${filter.name}: ${filter.value}`}
                  onClick={filter.clear}
                >
                  <span>
                    {filter.name}: {filter.value}
                  </span>
                  <X size={14} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
        {from && to && from > to && (
          <p role="alert">La fecha inicial debe ser anterior a la final.</p>
        )}
        {(tab !== "Movimientos" || from || to || activeFilters.length > 0) && (
          <div className="filter-actions">
            <button
              type="button"
              className="button secondary clear-filters"
              onClick={clearFilters}
            >
              Limpiar filtros
            </button>
          </div>
        )}
      </div>
    );
    return (
      <>
        <div className="page-heading">
          <div className="page-heading-content">
            <p className="eyebrow">TUS FINANZAS PERSONALES</p>
            <div className="section-title-row">
              <h1>
                {tab === "Inicio"
                  ? homeSummaryVisible
                    ? "Tu resumen"
                    : "Tu espacio"
                  : tab}
              </h1>
              {tab === "Apartados" && savingsPrivacy}
            </div>
          </div>
        </div>
        {duePending > 0 && tab !== "Movimientos" && (
          <div className="notice">
            <span>
              Tienes {duePending}{" "}
              {duePending === 1
                ? "movimiento pendiente"
                : "movimientos pendientes"}{" "}
              por confirmar.
            </span>
            <button
              className="text-button"
              onClick={() => navigate("Movimientos")}
            >
              Revisar pendientes
            </button>
          </div>
        )}
        {error && (
          <div className="alert transient-alert" role="alert">
            <span>{error}</span>
            {loaded && (
              <button aria-label="Cerrar error" onClick={() => setError("")}>
                <X size={16} />
              </button>
            )}
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
        {tab === "Inicio" && !homeSummaryVisible && (
          <HomeLanding
            disabled={!loaded || busy}
            onMovements={() => navigate("Movimientos")}
            onPayment={() => {
              setError("");
              setModal({ kind: "movement", initialType: "payment" });
            }}
            onSavings={() => navigate("Apartados")}
            onSummary={() => {
              setHomeSummaryVisible(true);
              pageRef.current?.scrollTo({ top: 0 });
            }}
          />
        )}
        {tab === "Inicio" && homeSummaryVisible && (
          <>
            {(data.movements.length > 0 ||
              (data.pendingMovements?.length ?? 0) > 0 ||
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
            <section className="overview">
              <div className="balance-card">
                <div className="balance-label">
                  <span>Saldo disponible</span>
                  <Wallet size={23} />
                </div>
                <div className="balance-number">
                  {money(freeAmount(data))}
                  <span>MXN</span>
                </div>
                <p>
                  <span className="light-dot" /> Ingresos menos gastos y
                  apartados
                </p>
                <div className="balance-decoration" />
              </div>
              <button
                type="button"
                className="stat stat-link"
                aria-label="Ver ingresos"
                onClick={() => showMovements("income")}
              >
                <span className="stat-icon income">
                  <ArrowDownLeft size={20} />
                </span>
                <span>Ingresos</span>
                <strong>{money(incomes)}</strong>
                <small>Total registrado · Ver listado</small>
              </button>
              <button
                type="button"
                className="stat stat-link"
                aria-label="Ver egresos"
                onClick={() => showMovements("expense")}
              >
                <span className="stat-icon expense">
                  <ArrowUpRight size={20} />
                </span>
                <span>Egresos</span>
                <strong>{money(expenses)}</strong>
                <small>Pagos y abonos · Ver listado</small>
              </button>
              <button
                type="button"
                className="stat stat-link stat-credit"
                aria-label="Ver deuda adquirida"
                onClick={() => showMovements("credit")}
              >
                <span className="stat-icon debt">
                  <HandCoins size={20} />
                </span>
                <span>Deuda adquirida</span>
                <strong>{money(acquired)}</strong>
                <small>Compras con TDC · Ver listado</small>
              </button>
            </section>
            <section className="dashboard-grid">
              <div className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Últimos movimientos</h2>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => showMovements("all")}
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
                    {data.debts.filter((d) => balance(d) > 0).length} deudas por
                    liquidar
                  </p>
                  <div className="divider" />

                  <button
                    className="text-button"
                    onClick={() => navigate("Deudas")}
                  >
                    Administrar deudas <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </section>
            <div className="privacy-footer">
              <ShieldCheck size={16} /> Tu información es tuya. Sin cuentas, sin
              conexiones bancarias.
            </div>
          </>
        )}
        {tab === "Movimientos" && (
          <div className="movements-layout">
            <section className="panel full-panel wallet-panel">
              <div className="wallet-balances" aria-label="Banco y efectivo">
                <div>
                  <span>Banco disponible</span>
                  <strong>{money(wallets.bank)}</strong>
                </div>
                <div>
                  <span>Efectivo disponible</span>
                  <strong>{money(wallets.cash)}</strong>
                </div>
                {wallets.unassigned !== 0 && (
                  <div>
                    <span>Sin clasificar</span>
                    <strong>{money(wallets.unassigned)}</strong>
                  </div>
                )}
              </div>
              {wallets.unassigned !== 0 && (
                <p className="helper wallet-help">
                  Revisa los movimientos con método Otro o no reconocido para
                  asignarlos.
                </p>
              )}
            </section>
            <section className="panel full-panel movement-main">
              <PendingPanel
                data={data}
                mutate={mutate}
                busy={busy}
                currentDay={currentDay}
              />
              <div
                className="movement-type-tabs"
                role="tablist"
                aria-label="Mostrar movimientos"
              >
                {(
                  [
                    ["all", "Todos"],
                    ["income", "Ingresos"],
                    ["expense", "Gastos"],
                    ["credit", "TDC"],
                    ["transfer", "Traspasos"],
                  ] as const
                ).map(([type, label], index, options) => (
                  <button
                    key={type}
                    id={`movement-tab-${type}`}
                    type="button"
                    role="tab"
                    aria-selected={movementListVisible && typeFilter === type}
                    aria-controls="movement-results"
                    tabIndex={
                      (movementListVisible ? typeFilter === type : index === 0)
                        ? 0
                        : -1
                    }
                    onClick={() => selectMovementType(type)}
                    onKeyDown={(e) => {
                      let next = index;
                      if (e.key === "ArrowRight")
                        next = (index + 1) % options.length;
                      else if (e.key === "ArrowLeft")
                        next = (index + options.length - 1) % options.length;
                      else if (e.key === "Home") next = 0;
                      else if (e.key === "End") next = options.length - 1;
                      else return;
                      e.preventDefault();
                      selectMovementType(options[next][0]);
                      e.currentTarget.parentElement
                        ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
                        [next]?.focus();
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <details className="movement-filters">
                <summary>Filtros</summary>
                {filters}
              </details>
              <div
                id="movement-results"
                className="movement-results"
                role={movementListVisible ? "tabpanel" : undefined}
                aria-labelledby={
                  movementListVisible ? `movement-tab-${typeFilter}` : undefined
                }
              >
                {movementListVisible ? (
                  <>
                    <div className="movement-search">
                      <input
                        type="search"
                        aria-label="Buscar movimientos"
                        placeholder="Buscar movimientos…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                      {search && (
                        <button
                          type="button"
                          className="movement-search-clear"
                          aria-label="Borrar búsqueda"
                          onClick={() => setSearch("")}
                        >
                          <X size={18} aria-hidden="true" />
                        </button>
                      )}
                    </div>
                    <div className="panel-heading">
                      <h2>
                        {filtered.length} {filteredLabel}
                      </h2>
                      <ExportButtons
                        disabled={exporting || !filtered.length}
                        onExport={(format) =>
                          void exportReadable(
                            movementDocument,
                            exportNames[typeFilter],
                            format,
                          )
                        }
                      />
                    </div>
                    {typeFilter === "all" && filtered.length > 0 && (
                      <div className="movement-totals">
                        {reportColumns.map((column) => (
                          <span
                            key={column.key}
                            className={
                              column.key === "acquired"
                                ? "total-wide"
                                : undefined
                            }
                          >
                            {column.key === "expense"
                              ? "Gastos"
                              : column.key === "acquired"
                                ? "Compras TDC"
                                : "Ingresos"}
                            : <strong>{money(column.total)}</strong>
                          </span>
                        ))}
                      </div>
                    )}
                    {typeFilter !== "all" &&
                      typeFilter !== "credit" &&
                      filtered.length > 0 && (
                        <p className="filtered-total">
                          {typeFilter === "transfer"
                            ? "Total trasladado"
                            : `Total de ${typeFilter === "income" ? "ingresos" : "gastos"}`}
                          : <strong>{money(filteredTotal)}</strong>
                        </p>
                      )}
                    {tdcView && filtered.length > 0 && (
                      <div className="filtered-total movement-totals tdc-totals">
                        {filteredTotal > 0 && (
                          <span>
                            Compras: <strong>{money(filteredTotal)}</strong>
                          </span>
                        )}
                        {filteredCardPayments > 0 && (
                          <span>
                            Abonos:{" "}
                            <strong>{money(filteredCardPayments)}</strong>
                          </span>
                        )}
                      </div>
                    )}

                    {movementList(filtered)}
                  </>
                ) : (
                  <p className="helper movement-selection-prompt">
                    Elige una opción para ver tus movimientos.
                  </p>
                )}
              </div>
            </section>
            <RecurringPanel
              onEditing={setPlanningEditing}
              data={data}
              suggestions={merchantOptions}
              mutate={mutate}
              busy={busy}
              categories={[...categories, "Pago de deuda"]}
            />
          </div>
        )}
        {tab === "Deudas" && (
          <>
            <div className="summary-strip">
              <span>Saldo pendiente total</span>
              <strong>{money(pending)}</strong>
            </div>

            <div className="debt-grid">
              {data.debts.map((d) => {
                const cycle = cardCycle(d, data);
                const due = cycle
                  ? cycle.amount > 0
                    ? cycle.due
                    : cycle.nextDue
                  : d.due;
                return (
                  <details
                    className="panel debt-detail"
                    name="debts"
                    key={d.id}
                  >
                    <summary className="debt-toggle">
                      <h2>{d.creditor}</h2>
                    </summary>
                    <div className="panel-heading">
                      <button
                        className="icon-action"
                        title="Editar deuda"
                        aria-label={`Editar deuda ${d.creditor}`}
                        onClick={() => {
                          setError("");
                          setModal({ kind: "debt", debt: d });
                        }}
                      >
                        <EditIcon />
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
                    <strong className="debt-number">{money(balance(d))}</strong>
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
                          Estimación sin intereses ni comisiones.
                        </p>
                      </div>
                    )}
                    <MsiProjection data={data} debt={d} />
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
                  </details>
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
          <>
            {!canSeeSavings && !savingCreating && (
              <section className="panel savings-hidden">
                <h2>Ahorros ocultos</h2>
                <p>••••</p>
                <button
                  className="button secondary"
                  onClick={() =>
                    setModal({ kind: "movement", initialType: "saving" })
                  }
                >
                  Agregar dinero
                </button>
              </section>
            )}
            <div
              hidden={!canSeeSavings && !savingCreating}
              inert={!canSeeSavings && !savingCreating}
            >
              <SavingsPanel
                data={data}
                showDetails={canSeeSavings}
                mutate={mutate}
                busy={busy}
                creating={savingCreating}
                onClose={() => setSavingCreating(false)}
                onEditing={setPlanningEditing}
              />
            </div>
          </>
        )}
        {tab === "Reportes" && (
          <>
            <section className="panel full-panel report-results">
              <p className="report-range">Periodo: {reportRange}</p>
              {groupTotals.size ? (
                <div className="report-periods">
                  {[...groupTotals]
                    .sort(([a], [b]) => b.localeCompare(a))
                    .map(([key, g]) => (
                      <section
                        className="report-period"
                        key={key}
                        aria-label={periodLabel(key)}
                      >
                        <h3>{periodLabel(key)}</h3>
                        <dl className="report-totals credit-report-totals report-period-values">
                          {reportFields.map((field) => (
                            <div
                              key={field.key}
                              className={
                                field.key === "free"
                                  ? "report-available"
                                  : undefined
                              }
                            >
                              <dt>{field.label}</dt>
                              <dd
                                className={
                                  field.key === "income"
                                    ? "positive"
                                    : undefined
                                }
                              >
                                {money(field.value(g))}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      </section>
                    ))}
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
              <details className="report-filters">
                <summary>Filtros</summary>
                {filters}
              </details>
              <ExportButtons
                disabled={exporting || !groupTotals.size}
                onExport={(format) =>
                  void exportReadable(
                    reportDocument,
                    `reporte-${exportNames[typeFilter]}`,
                    format,
                  )
                }
              />
            </section>
            <details
              className="panel report-budget"
              onToggle={(event) => {
                if (
                  event.target === event.currentTarget &&
                  !event.currentTarget.open
                ) {
                  event.currentTarget
                    .querySelectorAll("details[open]")
                    .forEach((item) => item.removeAttribute("open"));
                  setPlanningEditing(false);
                }
              }}
            >
              <summary>Presupuesto</summary>
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
            </details>
          </>
        )}
        {tab === "Respaldos" && (
          <div className="backup-grid">
            <div className="backup-tools">
              <details className="panel backup-fold backup-save">
                <summary>Guardar respaldo</summary>
                <div className="backup-fold-content">
                  <p className="backup-last">
                    {data.lastBackupAt
                      ? `Exportación iniciada: ${new Date(data.lastBackupAt).toLocaleString("es-MX")}`
                      : "Todavía no has exportado un respaldo."}
                  </p>
                  <p className="helper">
                    {backupOverdue(data.lastBackupAt)
                      ? "Guarda un JSON cada semana para poder restaurar tus datos."
                      : "Comprueba que guardaste el JSON para poder restaurar tus datos."}
                  </p>
                  <button
                    className="button"
                    aria-label="Exportar respaldo JSON"
                    disabled={!loaded || busy}
                    onClick={() => void exportBackup()}
                  >
                    <Download size={18} /> Descargar JSON
                  </button>
                </div>
              </details>
              <details className="panel backup-fold backup-restore">
                <summary>Restaurar respaldo</summary>
                <div className="backup-fold-content">
                  <p>
                    Importar reemplaza los datos de este dispositivo. Guarda
                    primero tu respaldo actual.
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
                            throw Error(
                              "El archivo supera el límite de 10 MB.",
                            );
                          const backup = validateBackup(
                            JSON.parse(await file.text()),
                          );
                          if (
                            confirm(
                              `¿Reemplazar todos los datos por ${backup.movements.length} movimientos, ${backup.debts.length} deudas, ${backup.budgets?.length ?? 0} presupuestos y ${backup.recurrents?.length ?? 0} recurrentes y ${backup.pendingMovements?.length ?? 0} pendientes?`,
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
                </div>
              </details>
              <details className="panel backup-fold backup-exports">
                <summary>Exportar movimientos</summary>
                <div className="backup-fold-content">
                  <p>
                    Para consultar o compartir. Para restaurar la app, usa JSON.
                  </p>
                  <ExportButtons
                    disabled={exporting || !data.movements.length}
                    onExport={(format) =>
                      void exportReadable(
                        movementExport(
                          normalizeExports(newestFirst),
                          "Todos los movimientos",
                          ["Todos los registros"],
                        ),
                        "movimientos",
                        format,
                      )
                    }
                  />
                  <button
                    className="button secondary"
                    aria-label="Exportar movimientos CSV"
                    onClick={() =>
                      download(
                        csv(data.movements),
                        `movimientos-${today()}.csv`,
                        "text/csv;charset=utf-8",
                      )
                    }
                  >
                    <Download size={18} /> CSV
                  </button>
                </div>
              </details>
            </div>
            <SecurityPanel />
            <section className="panel backup install">
              <span className="install-icon">
                <Wallet size={28} />
              </span>
              <h2>Mi dinero, en tu iPhone</h2>

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

              <div className="local-note">
                <ShieldCheck size={20} />
                <p>
                  No sincronizamos ni enviamos tus datos. Si borras los datos de
                  Safari, cambias de dispositivo o desinstalas la app, podrías
                  perderlos. Haz respaldos frecuentes. El archivo JSON contiene
                  tus datos sin cifrar.
                </p>
              </div>
            </section>
          </div>
        )}
      </>
    );
  }
  return (
    <div className={`app${sidebarCollapsed ? " sidebar-collapsed" : ""}`}>
      <aside className="sidebar" id="app-sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate("Inicio");
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
              className={navigationTab === t.name ? "active" : ""}
              aria-current={navigationTab === t.name ? "page" : undefined}
              onClick={() => navigate(t.name)}
            >
              <t.icon size={20} />
              <span>{t.name}</span>
              {navigationTab === t.name && <i />}
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
      </aside>
      <main>
        <header className="topbar">
          <div className="app-identity">
            <button
              className="sidebar-toggle"
              type="button"
              aria-label={
                sidebarCollapsed
                  ? "Mostrar menú lateral"
                  : "Ocultar menú lateral"
              }
              title={
                sidebarCollapsed
                  ? "Mostrar menú lateral"
                  : "Ocultar menú lateral"
              }
              aria-controls="app-sidebar"
              aria-expanded={!sidebarCollapsed}
              onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
            >
              <img
                src={`${import.meta.env.BASE_URL}icon-v2.svg`}
                alt=""
                width="32"
                height="32"
              />
            </button>
            <img
              className="wallet-static"
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
            <button
              type="button"
              className="keyboard-done"
              onClick={() =>
                (document.activeElement as HTMLElement | null)?.blur()
              }
            >
              Listo
            </button>
            <ThemeControl />
          </div>
        </header>
        <div className="page" ref={pageRef}>
          {renderPageContent(tab)}
        </div>
      </main>
      <div
        ref={previewFrameRef}
        className="page-preview-frame"
        aria-hidden="true"
        inert
      >
        <div ref={previewContentRef} className="page-preview-content">
          {previewTab && renderPageContent(previewTab)}
        </div>
      </div>
      {tab !== "Respaldos" && (
        <button
          className="button section-add"
          aria-label={
            tab === "Apartados"
              ? "Nuevo apartado"
              : tab === "Deudas"
                ? "Nueva deuda"
                : "Nuevo movimiento"
          }
          title={
            tab === "Apartados"
              ? "Nuevo apartado"
              : tab === "Deudas"
                ? "Nueva deuda"
                : "Nuevo movimiento"
          }
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
          <Plus size={26} aria-hidden="true" />
        </button>
      )}
      <nav className="mobile-nav" aria-label="Navegación principal">
        {tabs.map((t) => (
          <button
            className={navigationTab === t.name ? "active" : ""}
            aria-current={navigationTab === t.name ? "page" : undefined}
            key={t.name}
            onClick={() => navigate(t.name)}
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
                            Movement["type"] | "credit" | "payment" | "saving",
                        )
                      }
                    >
                      <option value="expense">Gasto</option>
                      <option value="income">Ingreso</option>
                      <option value="credit">Compra con TDC</option>
                      <option value="transfer">
                        Traspaso / retiro a efectivo
                      </option>
                      {!modal.movement && (
                        <>
                          <option value="payment">Abono a deuda</option>
                          <option value="saving">Apartado</option>
                        </>
                      )}
                    </select>
                  </Field>
                  <div className="form-grid">
                    <Field label="Importe (MXN)">
                      <MoneyInput
                        autoFocus
                        name="amount"
                        onAmountChange={(value) =>
                          setMovementAmount(value ?? 0)
                        }
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
                        onChange={setMovementDate}
                      />
                    </Field>
                  </div>
                  {movementDate > today() && (
                    <p className="helper" role="status">
                      Quedará pendiente hasta que confirmes.
                    </p>
                  )}
                  {movementType === "transfer" ? (
                    <>
                      <Field label="Tipo de traspaso">
                        <select
                          name="transferDirection"
                          value={transferDirection}
                          onChange={(e) =>
                            setTransferDirection(
                              e.target.value as NonNullable<
                                Movement["transferDirection"]
                              >,
                            )
                          }
                        >
                          <option value="bank-to-cash">
                            Retiro a efectivo (Banco → Efectivo)
                          </option>
                          <option value="cash-to-bank">
                            Depósito al banco (Efectivo → Banco)
                          </option>
                        </select>
                      </Field>
                      <p className="helper">
                        Saldo de origen:{" "}
                        {money(
                          transferDirection === "bank-to-cash"
                            ? transferSourceWallets.bank
                            : transferSourceWallets.cash,
                        )}
                      </p>
                      <Field label="Concepto del traspaso (opcional)">
                        <input
                          name="transferConcept"
                          maxLength={120}
                          defaultValue={modal.movement?.merchant}
                          placeholder={
                            transferDirection === "bank-to-cash"
                              ? "Retiro a efectivo"
                              : "Depósito al banco"
                          }
                        />
                      </Field>
                      <Field label="Notas (opcional)">
                        <textarea
                          name="notes"
                          maxLength={2000}
                          defaultValue={modal.movement?.notes}
                        />
                      </Field>
                    </>
                  ) : movementType === "saving" ? (
                    <>
                      <div>
                        <Field label="Apartado de ahorro">
                          <select
                            name="savingId"
                            required
                            defaultValue={
                              data.savings?.length === 1
                                ? data.savings[0].id
                                : ""
                            }
                          >
                            <option value="" disabled>
                              Selecciona un apartado
                            </option>
                            {(data.savings ?? []).map((saving) => (
                              <option key={saving.id} value={saving.id}>
                                {saving.name}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Reservar de">
                          <select
                            name="savingWallet"
                            defaultValue={
                              wallets.bank > 0
                                ? "bank"
                                : wallets.cash > 0
                                  ? "cash"
                                  : "unassigned"
                            }
                          >
                            {(["bank", "cash", "unassigned"] as WalletKey[])
                              .filter(
                                (key) =>
                                  key !== "unassigned" ||
                                  wallets.unassigned > 0,
                              )
                              .map((key) => (
                                <option key={key} value={key}>
                                  {walletNames[key]}
                                </option>
                              ))}
                          </select>
                        </Field>

                        {!data.savings?.length && (
                          <>
                            <p className="helper">
                              Primero crea una meta de ahorro en Apartados.
                            </p>
                            <button
                              type="button"
                              className="button secondary"
                              onClick={() => {
                                setModal(null);
                                navigate("Apartados");
                                setSavingCreating(true);
                              }}
                            >
                              Crear apartado
                            </button>
                          </>
                        )}
                      </div>
                    </>
                  ) : movementType === "payment" ? (
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
                        Reduce la deuda y el disponible.
                        {!data.debts.some((d) => balance(d) > 0) &&
                          " No hay deudas pendientes."}
                      </p>
                    </>
                  ) : (
                    <>
                      <Field label="Establecimiento o concepto">
                        <ConceptInput
                          suggestions={merchantOptions}
                          onSelectSuggestion={(concept) => {
                            const category = categoryForConcept(data, concept);
                            if (category) setMovementCategory(category);
                          }}
                          name="merchant"
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
                            value={movementCategory}
                            onChange={(e) => {
                              setMovementCategory(e.target.value);
                              e.currentTarget.blur();
                            }}
                          >
                            {[
                              ...new Set([
                                ...categories,
                                movementCategory,
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
                          {movementType === "credit" ? (
                            <input
                              name="method"
                              value="Tarjeta de crédito"
                              readOnly
                            />
                          ) : (
                            <select
                              name="method"
                              value={movementMethod}
                              onChange={(e) =>
                                setMovementMethod(e.target.value)
                              }
                            >
                              {[
                                "Efectivo",
                                "Tarjeta de débito",
                                "Tarjeta de crédito",
                                "Transferencia",
                                "Otro",
                              ].map((method) => (
                                <option key={method}>{method}</option>
                              ))}
                            </select>
                          )}
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
                              value={creditCardId}
                              onChange={(e) => setCreditCardId(e.target.value)}
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
                          <MsiFields
                            date={movementDate}
                            amount={movementAmount}
                            debt={creditDebts.find(
                              (d) => d.id === creditCardId,
                            )}
                            initial={modal.movement?.msi}
                            initialDate={modal.movement?.date}
                            initialDebtId={modal.movement?.creditDebtId}
                          />
                          {!creditDebts.length && (
                            <p className="helper">
                              Primero registra tu tarjeta en Deudas.
                            </p>
                          )}
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
                      Los importes de apertura no se editan.
                    </p>
                  )}
                  {!modal.debt && (
                    <p className="helper">
                      Saldo actual: lo que debes hoy. Los pagos anteriores no se
                      registran como gastos.
                      {debtKind === "credit" &&
                        " Sin adeudo, usa 0 en ambos importes."}
                    </p>
                  )}
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
                    <DatePicker
                      name="date"
                      defaultValue={today()}
                      onChange={setMovementDate}
                      required
                    />
                  </Field>
                  {movementDate > today() && (
                    <p className="helper" role="status">
                      Quedará pendiente hasta que confirmes.
                    </p>
                  )}
                  <p className="helper">Reduce la deuda y el disponible.</p>
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
