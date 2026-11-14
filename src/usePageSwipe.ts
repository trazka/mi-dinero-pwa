import { useCallback, useEffect, useRef, type RefObject } from "react";
import { createPageDrag, type PageDrag } from "./pageTransition";

type Config<T extends string> = {
  pageRef: RefObject<HTMLDivElement | null>;
  previewFrameRef: RefObject<HTMLDivElement | null>;
  previewContentRef: RefObject<HTMLDivElement | null>;
  tab: T;
  tabs: readonly T[];
  blocked: boolean;
  prepare: (next: T) => void;
  clear: () => void;
  commit: (next: T) => void;
};
type Gesture<T> = {
  x: number;
  y: number;
  origin: Element;
  mode: "pending" | "horizontal" | "native";
  next?: T;
  direction?: 1 | -1;
  drag?: PageDrag;
  distance: number;
  samples: { x: number; time: number }[];
  settling: boolean;
  complete: boolean;
};
export function usePageSwipe<T extends string>(config: Config<T>) {
  const latest = useRef(config);
  latest.current = config;
  const cancelRef = useRef<() => void>(() => {});
  const navigateRef = useRef<(next: T) => boolean>(() => false);
  useEffect(() => {
    const page = latest.current.pageRef.current;
    if (!page) return;
    let gesture: Gesture<T> | null = null;
    let ghostTarget: Element | null = null;
    let committing = false;
    const abort = () => {
      if (committing) return;
      const old = gesture;
      gesture = null;
      old?.drag?.cleanup();
      if (old?.next) latest.current.clear();
    };
    cancelRef.current = abort;
    const finish = (complete: boolean) => {
      const old = gesture;
      if (!old) return;
      gesture = null;
      if (complete && old.next) {
        committing = true;
        try {
          latest.current.commit(old.next);
        } finally {
          committing = false;
          old.drag?.cleanup();
        }
      } else {
        old.drag?.cleanup();
        if (old.next) latest.current.clear();
      }
    };
    navigateRef.current = (next: T) => {
      abort();
      const cfg = latest.current;
      if (
        next === cfg.tab ||
        cfg.blocked ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
        typeof page.animate !== "function"
      )
        return false;
      const direction =
        cfg.tabs.indexOf(next) > cfg.tabs.indexOf(cfg.tab) ? 1 : -1;
      cfg.prepare(next);
      const frame = cfg.previewFrameRef.current,
        content = cfg.previewContentRef.current;
      if (!frame || !content) {
        cfg.clear();
        return false;
      }
      const drag = createPageDrag(page, frame, content, direction);
      gesture = {
        x: 0,
        y: 0,
        origin: page,
        mode: "horizontal",
        next,
        direction,
        drag,
        distance: 0,
        samples: [],
        settling: true,
        complete: true,
      };
      drag.settle(true, () => finish(true), 320);
      return true;
    };
    const interrupt = () => {
      if (gesture?.settling && gesture.complete) finish(true);
      else abort();
    };
    const hasNativeScroll = (origin: Element, dx: number) => {
      let element: Element | null = origin;
      while (element && element !== page) {
        if (
          element.scrollWidth > element.clientWidth + 2 &&
          ["auto", "scroll"].includes(getComputedStyle(element).overflowX)
        ) {
          const max = element.scrollWidth - element.clientWidth;
          if (dx < 0 ? element.scrollLeft < max - 1 : element.scrollLeft > 1)
            return true;
        }
        element = element.parentElement;
      }
      return false;
    };
    const preview = (dx: number) => {
      if (!gesture) return;
      const direction = dx < 0 ? 1 : -1;
      const cfg = latest.current;
      const next = cfg.tabs[cfg.tabs.indexOf(cfg.tab) + direction];
      if (!next) {
        gesture.drag?.update(0);
        return;
      }
      if (gesture.direction !== direction) {
        gesture.drag?.cleanup();
        gesture.direction = direction;
        gesture.next = next;
        if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          cfg.prepare(next);
          const frame = cfg.previewFrameRef.current,
            content = cfg.previewContentRef.current;
          if (frame && content)
            gesture.drag = createPageDrag(page, frame, content, direction);
        }
      }
      gesture.distance = dx;
      gesture.drag?.update(dx);
    };
    const start = (event: TouchEvent) => {
      ghostTarget = null;
      if (gesture?.settling && gesture.complete) finish(true);
      else abort();
      if (
        latest.current.blocked ||
        event.touches.length !== 1 ||
        !(event.target instanceof Element)
      )
        return;
      const origin = event.target;
      const editable = origin.closest(
        "input, textarea, select, [contenteditable=true]",
      );
      if (
        origin.closest(
          "[role=dialog], [role=listbox], [role=slider], input[type=range]",
        ) ||
        (editable && editable === document.activeElement) ||
        window.getSelection()?.isCollapsed === false
      )
        return;
      const touch = event.touches[0];
      gesture = {
        x: touch.clientX,
        y: touch.clientY,
        origin,
        mode: "pending",
        distance: 0,
        samples: [{ x: touch.clientX, time: performance.now() }],
        settling: false,
        complete: false,
      };
    };
    const track = (event: TouchEvent, ending: boolean) => {
      if (!gesture || gesture.settling) return;
      if (latest.current.blocked || (!ending && event.touches.length !== 1)) {
        abort();
        return;
      }
      const touch = ending ? event.changedTouches[0] : event.touches[0];
      if (!touch) {
        abort();
        return;
      }
      const dx = touch.clientX - gesture.x,
        dy = touch.clientY - gesture.y;
      const now = performance.now();
      if (gesture.mode === "pending") {
        if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx) * 1.1)
          gesture.mode = "native";
        else if (Math.abs(dx) >= 12 && Math.abs(dx) > Math.abs(dy) * 1.25) {
          if (hasNativeScroll(gesture.origin, dx)) gesture.mode = "native";
          else gesture.mode = "horizontal";
        }
      }
      if (gesture.mode === "horizontal") {
        if (event.cancelable) event.preventDefault();
        ghostTarget = gesture.origin.closest(
          "button, a, input, select, label, summary",
        );
        preview(dx);
        gesture.samples.push({ x: touch.clientX, time: now });
        while (
          gesture.samples.length > 2 &&
          now - gesture.samples[0].time > 100
        )
          gesture.samples.shift();
      }
      if (!ending) return;
      if (gesture.mode !== "horizontal" || !gesture.next) {
        abort();
        return;
      }
      const sample = gesture.samples[0];
      const velocity =
        (touch.clientX - sample.x) / Math.max(1, now - sample.time);
      const width = page.getBoundingClientRect().width;
      const sameDirection = (dx < 0 ? 1 : -1) === gesture.direction;
      const complete =
        sameDirection &&
        (Math.abs(dx) >= Math.max(48, width * 0.2) ||
          (Math.abs(dx) >= 30 &&
            Math.abs(velocity) >= 0.5 &&
            velocity * dx > 0));
      gesture.settling = true;
      gesture.complete = complete;
      if (gesture.drag) gesture.drag.settle(complete, () => finish(complete));
      else finish(complete);
    };
    const move = (event: TouchEvent) => track(event, false);
    const end = (event: TouchEvent) => track(event, true);
    const click = (event: MouseEvent) => {
      if (
        event.detail !== 0 &&
        ghostTarget &&
        event.target instanceof Node &&
        ghostTarget.contains(event.target)
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
        ghostTarget = null;
      }
    };
    const pointer = (event: PointerEvent) => {
      if (event.pointerType !== "touch") ghostTarget = null;
    };
    const options = { passive: false, capture: true };
    page.addEventListener("touchstart", start, options);
    page.addEventListener("touchmove", move, options);
    page.addEventListener("touchend", end, options);
    page.addEventListener("touchcancel", abort, options);
    page.addEventListener("click", click, true);
    page.addEventListener("pointerdown", pointer, true);
    window.addEventListener("resize", interrupt);
    window.addEventListener("orientationchange", interrupt);
    document.addEventListener("visibilitychange", interrupt);
    return () => {
      abort();
      cancelRef.current = () => {};
      navigateRef.current = () => false;
      page.removeEventListener("touchstart", start, true);
      page.removeEventListener("touchmove", move, true);
      page.removeEventListener("touchend", end, true);
      page.removeEventListener("touchcancel", abort, true);
      page.removeEventListener("click", click, true);
      page.removeEventListener("pointerdown", pointer, true);
      window.removeEventListener("resize", interrupt);
      window.removeEventListener("orientationchange", interrupt);
      document.removeEventListener("visibilitychange", interrupt);
    };
  }, [config.pageRef]);
  const cancel = useCallback(() => cancelRef.current(), []);
  const goTo = useCallback((next: T) => navigateRef.current(next), []);
  return { cancel, goTo };
}
