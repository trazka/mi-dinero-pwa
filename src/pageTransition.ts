export type PageSnapshot = {
  frame: HTMLElement;
  content: HTMLElement;
  width: number;
};

export function snapshotPage(page: HTMLElement): PageSnapshot {
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
  const frame = document.createElement("div");
  frame.className = "page-transition-snapshot";
  frame.setAttribute("aria-hidden", "true");
  frame.inert = true;
  Object.assign(frame.style, {
    position: "fixed",
    left: `${bounds.left}px`,
    top: `${top}px`,
    width: `${bounds.width}px`,
    height: `${Math.max(0, bottom - top)}px`,
    overflow: "hidden",
    pointerEvents: "none",
    zIndex: "17",
  });
  const content = page.cloneNode(true) as HTMLElement;
  content.className = "page-snapshot-content";
  const originals = page.querySelectorAll<HTMLElement>("*");
  const copies = content.querySelectorAll<HTMLElement>("*");
  content.querySelectorAll(".section-add").forEach((button) => button.remove());
  content
    .querySelectorAll("[id]")
    .forEach((element) => element.removeAttribute("id"));
  const style = getComputedStyle(page);
  Object.assign(content.style, {
    position: "absolute",
    left: "0",
    top: `${bounds.top - top}px`,
    width: `${bounds.width}px`,
    height: `${bounds.height}px`,
    maxWidth: "none",
    margin: "0",
    padding: style.padding,
    boxSizing: style.boxSizing,
    overflow: "hidden",
    background: getComputedStyle(document.documentElement).backgroundColor,
  });
  frame.append(content);
  document.body.append(frame);
  content.scrollTop = page.scrollTop;
  copies.forEach((element, index) => {
    element.style.animation = "none";
    element.scrollTop = originals[index].scrollTop;
    element.scrollLeft = originals[index].scrollLeft;
  });
  return { frame, content, width: bounds.width };
}

export function slidePages(
  page: HTMLElement,
  snapshot: PageSnapshot,
  direction: 1 | -1,
) {
  const main = page.parentElement;
  const overflow = main?.style.overflowX ?? "";
  if (main) main.style.overflowX = "clip";
  const options = { duration: 360, easing: "cubic-bezier(0.32, 0.72, 0, 1)" };
  const targets = [
    page.querySelector(".page-heading-content"),
    ...Array.from(page.children).filter(
      (child) => !child.classList.contains("page-heading"),
    ),
  ].filter((target): target is HTMLElement => target instanceof HTMLElement);
  const pointerEvents = targets.map((target) => target.style.pointerEvents);
  targets.forEach((target) => {
    target.style.pointerEvents = "none";
  });
  const animations = targets.flatMap((target) => {
    if (!target) return [];
    return [
      target.animate(
        [
          { transform: `translateX(${direction * snapshot.width}px)` },
          { transform: "translateX(0)" },
        ],
        options,
      ),
    ];
  });
  animations.push(
    snapshot.content.animate(
      [
        { transform: "translateX(0)" },
        { transform: `translateX(${-direction * snapshot.width}px)` },
      ],
      options,
    ),
  );
  animations.forEach((animation) => {
    animation.id = "section-swipe";
  });
  let finished = false;
  const cleanup = () => {
    if (finished) return;
    finished = true;
    animations.forEach((animation) => animation.cancel());
    targets.forEach((target, index) => {
      target.style.pointerEvents = pointerEvents[index];
    });
    snapshot.frame.remove();
    if (main) main.style.overflowX = overflow;
    window.removeEventListener("resize", cleanup);
    window.removeEventListener("orientationchange", cleanup);
    document.removeEventListener("visibilitychange", cleanup);
  };
  window.addEventListener("resize", cleanup);
  window.addEventListener("orientationchange", cleanup);
  document.addEventListener("visibilitychange", cleanup);
  void Promise.all(
    animations.map((animation) => animation.finished.catch(() => {})),
  ).then(cleanup);
  return cleanup;
}
