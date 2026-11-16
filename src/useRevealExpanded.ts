import { useEffect, type RefObject } from "react";

// Revela únicamente el bloque que acaba de abrirse, sin mover otras pantallas.
export function useRevealExpanded(
  ref: RefObject<HTMLDivElement | null>,
  ready: boolean,
) {
  useEffect(() => {
    const page = ref.current;
    if (!page || !ready) return;
    let frame = 0;
    let pending: HTMLElement | null = null;
    function reveal() {
      const target = pending;
      pending = null;
      if (
        !target?.isConnected ||
        !target.getClientRects().length ||
        target.closest("[hidden]")
      )
        return;
      const pageBox = page!.getBoundingClientRect();
      const viewport = window.visualViewport;
      let top = Math.max(0, viewport?.offsetTop ?? 0, pageBox.top) + 12;
      let bottom = Math.min(
        window.innerHeight,
        (viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight),
      );
      if (getComputedStyle(page!).overflowY === "auto")
        bottom = Math.min(bottom, pageBox.bottom);
      for (const selector of [".topbar", ".mobile-nav"]) {
        const bar = document.querySelector<HTMLElement>(selector);
        if (!bar?.getClientRects().length) continue;
        const box = bar.getBoundingClientRect();
        if (selector === ".topbar" && box.top <= top)
          top = Math.max(top, box.bottom + 12);
        if (selector === ".mobile-nav") bottom = Math.min(bottom, box.top);
      }
      bottom -= 12;
      const box = target.getBoundingClientRect();
      const available = bottom - top;
      if (available <= 0) return;
      let delta = 0;
      if (box.height > available || box.top < top) delta = box.top - top;
      else if (box.bottom > bottom) delta = box.bottom - bottom;
      if (Math.abs(delta) < 1) return;
      const behavior = matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth";
      if (getComputedStyle(page!).overflowY === "auto")
        page!.scrollBy({ top: delta, behavior });
      else window.scrollBy({ top: delta, behavior });
    }
    function schedule(target: HTMLElement) {
      if (
        pending?.matches(".planning-form") &&
        !target.matches(".planning-form")
      )
        return;
      pending = target;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(reveal);
      });
    }
    function toggled(event: Event) {
      const target = event.target;
      if (target instanceof HTMLDetailsElement && target.open) schedule(target);
    }
    page.addEventListener("toggle", toggled, true);
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === "attributes") {
          const button = record.target as HTMLElement;
          if (
            button.getAttribute("aria-expanded") === "true" &&
            button.matches(".recurring-toggle")
          ) {
            const section = button.closest<HTMLElement>(".recurring-section");
            if (section) schedule(section);
          }
        } else
          for (const node of record.addedNodes) {
            if (!(node instanceof HTMLElement)) continue;
            const form = node.matches(".planning-form")
              ? node
              : node.querySelector<HTMLElement>(".planning-form");
            if (form) schedule(form);
          }
      }
    });
    observer.observe(page, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["aria-expanded"],
    });
    return () => {
      observer.disconnect();
      page.removeEventListener("toggle", toggled, true);
      cancelAnimationFrame(frame);
    };
  }, [ref, ready]);
}
