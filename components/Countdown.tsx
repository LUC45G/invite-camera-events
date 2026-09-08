"use client";

import { useEffect, useState } from "react";

function diff(target: number) {
  const now = Date.now();
  const ms = target - now;
  if (ms <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, done: true };
  }
  const seconds = Math.floor(ms / 1000) % 60;
  const minutes = Math.floor(ms / 60000) % 60;
  const hours = Math.floor(ms / 3600000) % 24;
  const days = Math.floor(ms / 86400000);
  return { days, hours, minutes, seconds, done: false };
}

// Estado fijo en SSR y primer render del cliente (evita hydration mismatch);
// el timer real arranca recién al montar.
const EMPTY = { days: 0, hours: 0, minutes: 0, seconds: 0, done: false };

export function Countdown({ target }: { target: string }) {
  const [ready, setReady] = useState(false);
  const [t, setT] = useState(EMPTY);

  useEffect(() => {
    setT(diff(new Date(target).getTime()));
    setReady(true);
    const id = setInterval(() => {
      setT(diff(new Date(target).getTime()));
    }, 1000);
    return () => clearInterval(id);
  }, [target]);

  if (!ready) {
    return (
      <div className="flex items-center justify-center gap-4 sm:gap-6">
        {["días", "horas", "min", "seg"].map((label) => (
          <div key={label} className="flex flex-col items-center">
            <span className="font-serif text-3xl text-ink tabular-nums sm:text-4xl">
              —
            </span>
            <span className="font-sans text-xs uppercase tracking-[0.2em] text-ink/55">
              {label}
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (t.done) {
    return (
      <p className="font-sans text-lg text-ink/70">¡Hoy es el gran día!</p>
    );
  }

  const cells = [
    { value: t.days, label: "días" },
    { value: t.hours, label: "horas" },
    { value: t.minutes, label: "min" },
    { value: t.seconds, label: "seg" },
  ];

  return (
    <div className="flex items-center justify-center gap-4 sm:gap-6">
      {cells.map((c) => (
        <div key={c.label} className="flex flex-col items-center">
          <span className="font-serif text-3xl text-ink tabular-nums sm:text-4xl">
            {String(c.value).padStart(2, "0")}
          </span>
          <span className="font-sans text-xs uppercase tracking-[0.2em] text-ink/55">
            {c.label}
          </span>
        </div>
      ))}
    </div>
  );
}
