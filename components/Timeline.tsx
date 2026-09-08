type ScheduleItem = { time: string; label: string; detail: string };

// Timeline responsive:
// - mobile: vertical, info alternada izq/der
// - desktop: horizontal, info alternada arriba/abajo
export function Timeline({ items }: { items: ScheduleItem[] }) {
  return (
    <>
      {/* Mobile: vertical */}
      <ol className="relative flex flex-col gap-8 border-l border-ink/20 pl-6 md:hidden">
        {items.map((item, i) => (
          <li key={item.time} className="relative">
            <span className="absolute -left-[2.05rem] top-1 h-2.5 w-2.5 rounded-full border border-bronze bg-cream" />
            <p className="font-serif text-xl text-ink tabular-nums">
              {item.time}
            </p>
            <p className="font-sans text-base text-ink/85">{item.label}</p>
            <p className="font-sans text-sm text-ink/55">{item.detail}</p>
          </li>
        ))}
      </ol>

      {/* Desktop: horizontal */}
      <ol className="relative hidden grid-cols-4 gap-6 md:grid">
        {items.map((item, i) => (
          <li
            key={item.time}
            className={`relative flex flex-col ${
              i % 2 === 0 ? "justify-start pt-0" : "justify-end pt-10"
            }`}
          >
            <p className="font-serif text-xl text-ink tabular-nums">
              {item.time}
            </p>
            <p className="font-sans text-base text-ink/85">{item.label}</p>
            <p className="font-sans text-sm text-ink/55">{item.detail}</p>
          </li>
        ))}
      </ol>
    </>
  );
}
