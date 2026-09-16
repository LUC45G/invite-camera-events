"use client";

import { useEffect, useState } from "react";
import {
  addScrollListener,
  getScrollHost,
  getScrollTop,
  getViewportHeight,
  smoothScrollTo,
} from "@/lib/scroll";

const LABELS = ["Inicio", "Historia", "Cronograma", "Ceremonia", "Preguntas", "Confirmar"];

export function ScrollDots() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const host = getScrollHost();
    const layout =
      document.querySelector(".snap-container") ?? document.body;
    const sections = Array.from(
      layout.querySelectorAll<HTMLElement>(":scope > section"),
    );

    const onScroll = () => {
      const top = getScrollTop(host) + getViewportHeight(host) / 2;
      const idx = sections.findIndex(
        (s) => top >= s.offsetTop && top < s.offsetTop + s.offsetHeight,
      );
      setActive(idx === -1 ? 0 : idx);
    };
    onScroll();
    return addScrollListener(host, onScroll);
  }, []);

  const goTo = (i: number) => {
    const host = getScrollHost();
    const layout =
      document.querySelector(".snap-container") ?? document.body;
    const sections = layout.querySelectorAll<HTMLElement>(":scope > section");
    const target = sections[i];
    if (target) smoothScrollTo(host, target.offsetTop);
  };

  return (
    <nav
      aria-label="Secciones"
      className="fixed right-4 top-1/2 z-40 -translate-y-1/2 sm:right-6"
    >
      <div className="relative flex flex-col items-center">
        {/* track */}
        <div className="absolute inset-y-3.5 left-1/2 w-px -translate-x-1/2 bg-ink/10" />
        {/* progress fill */}
        <div
          className="absolute left-1/2 w-px -translate-x-1/2 bg-bronze transition-all duration-500 ease-out"
          style={{
            top: "14px",
            height: `calc((100% - 28px) * ${active / (LABELS.length - 1)})`,
          }}
        />
        {LABELS.map((label, i) => (
          <button
            key={label}
            type="button"
            aria-label={label}
            aria-current={active === i ? "true" : undefined}
            onClick={() => goTo(i)}
            className="group relative z-10 flex h-7 items-center justify-center py-0"
          >
            {/* label */}
            <span
              className={`pointer-events-none absolute right-full mr-3 whitespace-nowrap font-sans text-xs tracking-[0.2em] uppercase transition-all duration-300 ${
                active === i
                  ? "translate-x-0 text-bronze opacity-100"
                  : "translate-x-2 text-ink/55 opacity-0 group-hover:translate-x-0 group-hover:opacity-100"
              }`}
            >
              {label}
            </span>
            {/* dot */}
            <span
              className={`block rounded-full border transition-all duration-300 group-hover:scale-125 ${
                active === i
                  ? "h-4 w-4 border-bronze bg-bronze"
                  : "h-3.5 w-3.5 border-ink/25 bg-cream group-hover:border-ink/50"
              }`}
            />
          </button>
        ))}
      </div>
    </nav>
  );
}
