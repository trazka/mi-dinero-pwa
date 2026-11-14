export type PageDrag = {
  update: (distance: number) => void;
  settle: (complete: boolean, done: () => void) => void;
  cleanup: () => void;
};

export function createPageDrag(
  page: HTMLElement,
  frame: HTMLElement,
  content: HTMLElement,
  direction: 1 | -1,
): PageDrag {
  const bounds = page.getBoundingClientRect();
  const header = page.parentElement
    ?.querySelector(".topbar")
    ?.getBoundingClientRect();
  const nav = document.querySelector(".mobile-nav")?.getBoundingClientRect();
  const top = Math.max(0, bounds.top, header?.bottom ?? 0);
  const bottom = Math.min(
    bounds.bottom,
    window.innerHeight,
    nav?.height ? nav.top : window.innerHeight,
  );
  const style = getComputedStyle(page);
  Object.assign(frame.style, {
    visibility: "visible",
    left: `${bounds.left}px`,
    top: `${top}px`,
    width: `${bounds.width}px`,
    height: `${Math.max(0, bottom - top)}px`,
  });
  Object.assign(content.style, {
    width: `${bounds.width}px`,
    minHeight: "100%",
    padding: style.padding,
    background: getComputedStyle(document.documentElement).backgroundColor,
  });
  const main = page.parentElement;
  const overflow = main?.style.overflowX ?? "";
  if (main) main.style.overflowX = "clip";
  const targets = [
    page.querySelector(".page-heading-content"),
    ...Array.from(page.children).filter(
      (child) => !child.classList.contains("page-heading"),
    ),
  ].filter((target): target is HTMLElement => target instanceof HTMLElement);
  const previous = targets.map((target) => ({
    transform: target.style.transform,
    pointerEvents: target.style.pointerEvents,
    willChange: target.style.willChange,
  }));
  targets.forEach((target) => {
    target.style.pointerEvents = "none";
    target.style.willChange = "transform";
  });
  let distance = 0;
  let disposed = false;
  let animations: Animation[] = [];
  const update = (value: number) => {
    if (disposed) return;
    distance =
      direction === 1
        ? Math.max(-bounds.width, Math.min(0, value))
        : Math.min(bounds.width, Math.max(0, value));
    targets.forEach((target) => {
      target.style.transform = `translateX(${distance}px)`;
    });
    content.style.transform = `translateX(${direction * bounds.width + distance}px)`;
  };
  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    animations.forEach((animation) => animation.cancel());
    targets.forEach((target, index) =>
      Object.assign(target.style, previous[index]),
    );
    frame.style.visibility = "hidden";
    content.style.transform = "none";
    if (main) main.style.overflowX = overflow;
  };
  const settle = (complete: boolean, done: () => void) => {
    if (disposed) return;
    const end = complete ? -direction * bounds.width : 0;
    const remaining = Math.abs(end - distance) / bounds.width;
    const options: KeyframeAnimationOptions = {
      duration: Math.max(100, Math.min(240, remaining * 280)),
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      fill: "forwards",
    };
    animations = targets.map((target) =>
      target.animate(
        [
          { transform: `translateX(${distance}px)` },
          { transform: `translateX(${end}px)` },
        ],
        options,
      ),
    );
    animations.push(
      content.animate(
        [
          { transform: `translateX(${direction * bounds.width + distance}px)` },
          { transform: `translateX(${direction * bounds.width + end}px)` },
        ],
        options,
      ),
    );
    animations.forEach((animation) => {
      animation.id = "section-swipe";
    });
    void Promise.all(
      animations.map((animation) => animation.finished.catch(() => {})),
    ).then(() => {
      if (!disposed) done();
    });
  };
  update(0);
  return { update, settle, cleanup };
}
