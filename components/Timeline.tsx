"use client";

import { Stagger } from "@/components/Stagger";
import type { ScheduleItem } from "@/lib/event-data";

export function Timeline({ items }: { items: ScheduleItem[] }) {
  return (
    <div className="relative mx-auto w-full max-w-[400px]">
      {/* línea vertical */}
      <div className="absolute bottom-6 left-[5px] top-6 w-px bg-ink/15" />
      <div className="flex flex-col gap-8">
        {items.map((item, i) => (
          <Stagger key={`${item.time}-${i}`} delay={120 + i * 120}>
            <div className="relative flex gap-4 pl-6 text-left">
              {/* dot */}
              <span className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full border border-bronze bg-bronze" />
              <div className="flex flex-col">
                <span className="font-sans text-xs tracking-[0.2em] text-bronze uppercase">
                  {item.time}
                </span>
                <h3 className="mt-1 font-serif text-xl text-ink" style={{ textWrap: "balance" }}>
                  {item.title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-ink/70 sm:text-base">
                  {item.description}
                </p>
              </div>
            </div>
          </Stagger>
        ))}
      </div>
    </div>
  );
}
