"use client";

import { useState } from "react";

type Props = {
  title: string;
  count?: number | string | null;
  defaultOpen?: boolean;
  actions?: React.ReactNode;
  children: React.ReactNode;
};

// Sección colapsable del panel admin: mismo patrón en todos los paneles.
export function CollapsibleSection({
  title,
  count,
  defaultOpen = false,
  actions,
  children,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const id = `section-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <section className="mb-8 rounded-sm border border-ink/10 bg-ivory p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-sans text-xs tracking-[0.2em] text-bronze uppercase">
          {title}
          {count !== null && count !== undefined ? ` (${count})` : ""}
        </h2>
        <div className="flex gap-2">
          {actions}
          <button
            type="button"
            aria-expanded={open}
            aria-controls={id}
            onClick={() => setOpen((v) => !v)}
            className="rounded-sm border border-ink/20 px-3 py-1.5 text-sm text-ink"
          >
            {open ? "Ocultar" : "Mostrar"}
          </button>
        </div>
      </div>
      {open && <div id={id} className="mt-3">{children}</div>}
    </section>
  );
}
