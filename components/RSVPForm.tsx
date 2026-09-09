"use client";

import { useState } from "react";

type Props = {
  token: string;
  contactName: string;
  contactPhone: string;
};

export function RSVPForm({ token, contactName, contactPhone }: Props) {
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"accepted" | "declined">("accepted");
  const [guests, setGuests] = useState(1);
  const [dietary, setDietary] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          name,
          status,
          guests,
          dietary: dietary.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo confirmar la asistencia");
        return;
      }
      setDone(true);
    } catch {
      setError("Hubo un problema de conexión. Intentalo de nuevo.");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <p className="text-base leading-relaxed text-ink">
        ¡Gracias, {name}! Confirmamos tu asistencia.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <label className="flex flex-col gap-1.5">
        <span className="font-sans text-base tracking-wide text-ink/70">
          Nombre
        </span>
        <input
          required
          name="name"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-sm border border-ink/20 bg-ivory px-3 py-2.5 text-lg text-ink focus:border-bronze"
          placeholder="Tu nombre…"
        />
      </label>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="font-sans text-base tracking-wide text-ink/70">
          ¿Podés asistir?
        </legend>
        <div className="flex gap-3">
          <button
            type="button"
            aria-pressed={status === "accepted"}
            onClick={() => setStatus("accepted")}
            className={`rounded-sm border px-4 py-2.5 text-lg transition-colors ${
              status === "accepted"
                ? "border-bronze bg-bronze text-ivory"
                : "border-ink/20 bg-ivory text-ink"
            }`}
          >
            Voy a estar
          </button>
          <button
            type="button"
            aria-pressed={status === "declined"}
            onClick={() => setStatus("declined")}
            className={`rounded-sm border px-4 py-2.5 text-lg transition-colors ${
              status === "declined"
                ? "border-ink/40 bg-ink/5 text-ink"
                : "border-ink/20 bg-ivory text-ink"
            }`}
          >
            No puedo ir
          </button>
        </div>
      </fieldset>

      {status === "accepted" ? (
        <label className="flex flex-col gap-1.5">
          <span className="font-sans text-base tracking-wide text-ink/70">
            ¿Cuántas personas van?
          </span>
          <input
            type="number"
            min={1}
            max={20}
            inputMode="numeric"
            name="guests"
            value={guests}
            onChange={(e) => setGuests(Number(e.target.value))}
            className="rounded-sm border border-ink/20 bg-ivory px-3 py-2.5 text-lg text-ink focus:border-bronze [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        </label>
      ) : (
        <div className="h-[4.5rem]" />
      )}

      {status === "accepted" ? (
        <label className="flex flex-col gap-1.5">
          <span className="font-sans text-base tracking-wide text-ink/70">
            Restricciones alimentarias <span className="text-ink/45">(opcional)</span>
          </span>
          <input
            value={dietary}
            onChange={(e) => setDietary(e.target.value)}
            name="dietary"
            spellCheck={false}
            className="rounded-sm border border-ink/20 bg-ivory px-3 py-2.5 text-lg text-ink focus:border-bronze"
            placeholder="Alergias, vegetarianos, etc.…"
          />
        </label>
      ) : (
        <div className="h-[4.5rem]" />
      )}

      {error && <p role="alert" className="text-base text-ink/80">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="rounded-sm bg-bronze px-4 py-3 text-lg text-ivory transition-colors hover:bg-bronze/90 disabled:opacity-60"
      >
        {pending ? "Enviando…" : "Confirmar asistencia"}
      </button>

      <p className="text-base text-ink/55">
        Cualquier cambio, comunicate con {contactName} al {contactPhone}.
      </p>
    </form>
  );
}
