export type ScrollHost = Window | Element;

function isWindow(host: ScrollHost): host is Window {
  return typeof Window !== "undefined" && host instanceof Window;
}

export function getScrollHost(): ScrollHost {
  if (
    typeof window !== "undefined" &&
    window.matchMedia("(min-width: 768px)").matches
  ) {
    const container = document.querySelector(".snap-container");
    if (container) return container;
  }
  return window;
}

export function getScrollTop(host: ScrollHost): number {
  return isWindow(host) ? host.scrollY : host.scrollTop;
}

export function getViewportHeight(host: ScrollHost): number {
  return isWindow(host) ? host.innerHeight : host.clientHeight;
}

export function addScrollListener(
  host: ScrollHost,
  onScroll: () => void,
): () => void {
  host.addEventListener("scroll", onScroll, { passive: true });
  return () => host.removeEventListener("scroll", onScroll);
}

export function smoothScrollTo(host: ScrollHost, top: number, duration = 900) {
  const start = getScrollTop(host);
  const delta = top - start;
  const startTime = performance.now();

  const easeInOutCubic = (t: number) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  function step(now: number) {
    const progress = Math.min((now - startTime) / duration, 1);
    host.scrollTo({ top: start + delta * easeInOutCubic(progress) });
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
