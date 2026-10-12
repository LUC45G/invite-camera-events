"use client";

import Image from "next/image";
import { useLayoutEffect, useRef, useState } from "react";
import { Stagger } from "@/components/Stagger";
import type { ScheduleItem } from "@/lib/event-data";

export function Timeline({ items }: { items: ScheduleItem[] }) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [rail, setRail] = useState<{ top: number; bottom: number } | null>(null);

  useLayoutEffect(() => {
    const container = timelineRef.current;
    if (!container) return;

    const updateRail = () => {
      const dots = container.querySelectorAll<HTMLElement>("[data-timeline-dot]");
      const first = dots[0];
      const last = dots[dots.length - 1];
      if (!first || !last) return;

      const bounds = container.getBoundingClientRect();
      const firstBounds = first.getBoundingClientRect();
      const lastBounds = last.getBoundingClientRect();
      setRail({
        top: firstBounds.top + firstBounds.height / 2 - bounds.top,
        bottom: bounds.bottom - (lastBounds.top + lastBounds.height / 2),
      });
    };

    updateRail();
    const observer = new ResizeObserver(updateRail);
    observer.observe(container);
    return () => observer.disconnect();
  }, [items.length]);

  return (
    <div ref={timelineRef} className="relative mx-auto w-full max-w-5xl py-2">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-3 z-0 w-[2px] md:left-1/2 md:-translate-x-1/2"
        style={{
          top: rail?.top ?? 0,
          bottom: rail?.bottom ?? 0,
          visibility: rail ? "visible" : "hidden",
          backgroundColor: "rgb(172, 133, 136)",
        }}
      />
      <div className="flex flex-col gap-9 md:gap-2">
        {items.map((item, i) => (
          <Stagger key={`${item.time}-${i}`} delay={120 + i * 120}>
            <article className="relative grid grid-cols-[1.5rem_3rem_minmax(0,1fr)] items-center gap-x-3 md:grid-cols-[minmax(0,1fr)_10rem_minmax(0,1fr)] md:gap-x-0">
              <span data-timeline-dot className="absolute left-2 top-1/2 z-30 h-2 w-2 -translate-y-1/2 rounded-full border border-[#AC8588] bg-cream md:left-1/2 md:-translate-x-1/2" />

              <div
                className={`relative z-10 col-start-2 row-start-1 flex ${
                  i % 2 === 0 ? "md:justify-end" : "md:justify-start"
                }`}
              >
                <div className="relative h-12 w-12 md:h-16 md:w-16">
                  <Image
                    src={item.icon}
                    alt=""
                    fill
                    sizes="(min-width: 768px) 64px, 48px"
                    className="object-contain"
                    unoptimized
                  />
                </div>
              </div>

              <div
                className={`col-start-3 row-start-1 min-w-0 text-left md:row-start-1 ${
                  i % 2 === 0
                    ? "md:col-start-3 md:pl-6"
                    : "md:col-start-1 md:pr-6 md:text-right"
                }`}
              >
                <span className="font-sans text-xs tracking-[0.2em] text-bronze uppercase">
                  {item.time}
                </span>
                <h3 className="mt-1 font-serif text-xl leading-none text-[#AC8588] sm:text-2xl" style={{ textWrap: "balance" }}>
                  {item.title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-ink/70 sm:text-base">
                  {item.description}
                </p>
              </div>
            </article>
          </Stagger>
        ))}
      </div>
    </div>
  );
}
