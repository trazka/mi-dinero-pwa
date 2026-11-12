import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import {
  authenticate,
  biometricsAvailable,
  enroll,
  LOCK_KEY,
  readLock,
  writeLock,
  recoveryMatches,
  type LockConfig,
} from "./security";

const SecurityContext = createContext<{
  config: LockConfig | null;
  save: (config: LockConfig | null) => Promise<void>;
  lock: () => void;
  verify: (onVerified: () => void) => void;
  busy: (value: boolean) => void;
} | null>(null);
export default function SecurityGate({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<LockConfig | null>(null);
  const [checking, setChecking] = useState(true);
  const [locked, setLocked] = useState(true);
  const [started, setStarted] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void readLock()
      .then((value) => {
        if (active) {
          setConfig(value);
          setLocked(!!value);
          setStarted(!value);
        }
      })
      .catch(() => {
        if (active)
          setError(
            "No se pudo leer el bloqueo. Reintenta abrir la app; tus datos se conservan.",
          );
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => {
      active = false;
    };
  }, []);
  const [working, setWorking] = useState(false);
  const [recovery, setRecovery] = useState(false);
  const [code, setCode] = useState("");
  const internal = useRef(false);
  const pendingVerification = useRef<(() => void) | null>(null);
  useEffect(() => {
    const hide = () => {
      if (document.hidden && config && !internal.current) {
        pendingVerification.current = null;
        setLocked(true);
        setCode("");
        setError("");
      }
    };
    document.addEventListener("visibilitychange", hide);
    const sync = (event: StorageEvent) => {
      if (event.key === LOCK_KEY) location.reload();
    };
    window.addEventListener("storage", sync);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("storage", sync);
    };
  }, [config]);
  async function unlock() {
    if (!config) {
      location.reload();
      return;
    }
    internal.current = true;
    setWorking(true);
    setError("");
    try {
      if (recovery) {
        if (!(await recoveryMatches(config, code)))
          throw Error("El código de recuperación no es correcto.");
      } else await authenticate(config);
      setStarted(true);
      setLocked(document.hidden);
      if (!document.hidden) {
        const verified = pendingVerification.current;
        pendingVerification.current = null;
        verified?.();
      }
      setCode("");
      setRecovery(false);
    } catch (err) {
      setError(
        err instanceof DOMException
          ? "No se completó la autenticación. Puedes reintentar o usar tu código de recuperación."
          : err instanceof Error
            ? err.message
            : "No se pudo desbloquear.",
      );
    } finally {
      internal.current = false;
      setWorking(false);
    }
  }
  return (
    <SecurityContext.Provider
      value={{
        config,
        save: async (next) => {
          await writeLock(next);
          setConfig(next);
        },
        lock: () => setLocked(true),
        verify: (onVerified) => {
          if (!config) return;
          pendingVerification.current = onVerified;
          setCode("");
          setError("");
          setLocked(true);
        },
        busy: (value) => {
          internal.current = value;
        },
      }}
    >
      <div hidden={locked} inert={locked}>
        {started ? children : null}
      </div>
      {locked && (
        <main className="lock-screen">
          <section className="panel lock-card" aria-label="Mi dinero bloqueado">
            <LockKeyhole size={40} />
            <h1>Mi dinero está bloqueado</h1>
            <p>Desbloquea para ver tus finanzas.</p>
            {recovery && (
              <label>
                Código de recuperación
                <input
                  autoFocus
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                />
              </label>
            )}
            {error && <p role="alert">{error}</p>}
            <button
              className="button"
              disabled={working || checking}
              onClick={() => void unlock()}
            >
              {working || checking
                ? "Verificando…"
                : !config
                  ? "Reintentar"
                  : recovery
                    ? "Usar código"
                    : "Desbloquear con el dispositivo"}
            </button>
            {config && (
              <button
                className="text-button"
                disabled={working || checking}
                onClick={() => {
                  setRecovery(!recovery);
                  setError("");
                }}
              >
                {recovery
                  ? "Usar Face ID o código del dispositivo"
                  : "Usar código de recuperación"}
              </button>
            )}
          </section>
        </main>
      )}
    </SecurityContext.Provider>
  );
}
export function useSecurity() {
  return useContext(SecurityContext)!;
}
export function SecurityPanel() {
  const security = useContext(SecurityContext)!;
  const [available, setAvailable] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<Awaited<
    ReturnType<typeof enroll>
  > | null>(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    void biometricsAvailable()
      .then(setAvailable)
      .catch(() => setAvailable(false));
  }, []);
  async function setup() {
    setBusy(true);
    security.busy(true);
    setError("");
    try {
      setPending(await enroll());
      setSaved(false);
    } catch {
      setError(
        "No se activó el bloqueo. Reintenta y autoriza la llave de acceso en tu dispositivo.",
      );
    } finally {
      security.busy(false);
      setBusy(false);
    }
  }
  return (
    <section className="panel backup security-panel">
      <ShieldCheck size={24} />
      <h2>Seguridad</h2>
      <p>
        Bloqueo opcional al abrir y al dejar la app. El iPhone decide si utiliza
        Face ID o el código del dispositivo.
      </p>
      <p className="helper">
        Protege el acceso a la interfaz. Los datos locales y los respaldos JSON
        no se cifran con este bloqueo.
      </p>
      {error && <p role="alert">{error}</p>}
      {security.config ? (
        <>
          <p>Bloqueo activado</p>
          <button className="button secondary" onClick={security.lock}>
            Bloquear ahora
          </button>
          <button
            className="text-button"
            onClick={() => {
              if (
                confirm(
                  "¿Desactivar el bloqueo de Mi dinero en este dispositivo?",
                )
              ) {
                try {
                  void security
                    .save(null)
                    .catch(() =>
                      setError(
                        "No se pudo guardar el cambio. El bloqueo sigue activo.",
                      ),
                    );
                } catch {
                  setError(
                    "No se pudo guardar el cambio. El bloqueo sigue activo.",
                  );
                }
              }
            }}
          >
            Desactivar bloqueo
          </button>
        </>
      ) : pending ? (
        <>
          <p>
            Guarda este código fuera de la app. Permite entrar si pierdes acceso
            a tu llave.
          </p>
          <code className="recovery-code">{pending.code}</code>
          <label className="recovery-confirm">
            <input
              type="checkbox"
              checked={saved}
              onChange={(e) => setSaved(e.target.checked)}
            />
            Ya guardé mi código de recuperación
          </label>
          <button
            className="button"
            disabled={!saved}
            onClick={() => {
              try {
                void security
                  .save(pending.config)
                  .then(() => setPending(null))
                  .catch(() =>
                    setError(
                      "No se pudo guardar el bloqueo. No se ha activado.",
                    ),
                  );
              } catch {
                setError("No se pudo guardar el bloqueo. No se ha activado.");
              }
            }}
          >
            Confirmar activación
          </button>
          <button className="text-button" onClick={() => setPending(null)}>
            Cancelar activación
          </button>
        </>
      ) : (
        <>
          <button
            className="button secondary"
            disabled={!available || busy}
            onClick={() => void setup()}
          >
            {busy ? "Configurando…" : "Activar bloqueo del dispositivo"}
          </button>
          {available === false && (
            <p>
              Este navegador no ofrece autenticación compatible. Prueba desde la
              app instalada con Safari en un iPhone con bloqueo de pantalla y
              llaves de acceso configurados.
            </p>
          )}
        </>
      )}
    </section>
  );
}
