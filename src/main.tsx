import React, { Component, useLayoutEffect, type ReactNode } from "react";
import ReactDOM from "react-dom/client";
import "./style.css";

declare global {
  interface Window {
    __miDineroUpdate?: () => Promise<void>;
    __miDineroStartup?: { fail(message: string): void; ready(): void };
  }
}

class StartupBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    console.error("No se pudo iniciar React", error);
    window.__miDineroStartup?.fail(error.message);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function Ready() {
  useLayoutEffect(() => {
    window.__miDineroStartup?.ready();
  }, []);
  return null;
}

// Load App inside a catchable promise. Missing chunks or module initialization
// errors must leave a useful message even when React itself cannot render.
import("./App")
  .then(({ default: App }) => {
    ReactDOM.createRoot(document.getElementById("root")!).render(
      <React.StrictMode>
        <StartupBoundary>
          <App />
          <Ready />
        </StartupBoundary>
      </React.StrictMode>,
    );
  })
  .catch((error: unknown) => {
    console.error("No se pudo cargar Mi dinero", error);
    window.__miDineroStartup?.fail(
      error instanceof Error ? error.message : String(error),
    );
  });

// A registration failure must never prevent React from starting. In prompt mode
// an existing worker stays active until its clients close; check for updates on
// every online launch, without unregistering it or touching caches or IndexedDB.
import("virtual:pwa-register")
  .then(({ registerSW }) => {
    const applyUpdate = registerSW({
      onOfflineReady() {
        window.dispatchEvent(new Event("offline-ready"));
      },
      onNeedRefresh() {
        window.__miDineroUpdate = () => applyUpdate(true);
        window.dispatchEvent(new Event("update-ready"));
      },
      onRegisteredSW(_url, registration) {
        if (navigator.onLine)
          void registration
            ?.update()
            .catch((error) =>
              console.warn("No se pudo comprobar la actualización", error),
            );
      },
      onRegisterError(error) {
        console.warn("No se pudo preparar el modo sin conexión", error);
      },
    });
  })
  .catch((error) => console.warn("No se pudo cargar el registro PWA", error));
