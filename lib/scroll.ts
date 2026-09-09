export function smoothScrollTo(container: Element, top: number, duration = 900) {
  const start = container.scrollTop;
  const delta = top - start;
  const startTime = performance.now();

  const easeInOutCubic = (t: number) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  function step(now: number) {
    const progress = Math.min((now - startTime) / duration, 1);
    container.scrollTo({ top: start + delta * easeInOutCubic(progress) });
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

export function getSnapContainer(): Element | null {
  return document.querySelector(".snap-container");
}
