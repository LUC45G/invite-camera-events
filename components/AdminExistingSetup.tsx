"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { argentinaInput, argentinaInstant, eventSchedule } from "@/lib/setup-policy";

type Props = {
  event: { name: string; slug: string; reveal_at: string | null; deletion_pending: boolean };
  suggestedStart: string;
  counts: { photos: number; families: number; sessions: number; guests: number };
};

export function AdminExistingSetup({ event, suggestedStart, counts }: Props) {
  const router = useRouter();
  const [choice, setChoice] = useState<"keep" | "delete" | null>(event.deletion_pending ? "delete" : null);
  const [starts, setStarts] = useState(argentinaInput(suggestedStart));
  const minimum = eventSchedule(suggestedStart).min_reveal_at;
  const [reveal, setReveal] = useState(argentinaInput(event.reveal_at && new Date(event.reveal_at) >= new Date(minimum) ? event.reveal_at : minimum));
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setError(null);
    try {
      const response = await fetch(choice === "delete" ? "/api/admin/wipe" : "/api/admin/setup", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(choice === "delete" ? { slug: event.slug, confirmation } : {
          starts_at: argentinaInstant(starts), reveal_at: argentinaInstant(reveal),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo completar la operación");
      router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "No se pudo completar"); }
    finally { setBusy(false); }
  }

  return <main className="admin-scroll min-h-dvh bg-cream px-6 py-12">
    <div className="mx-auto max-w-xl">
      <h1 className="font-serif text-4xl text-ink">Configurar el evento existente</h1>
      <p className="mt-4">{event.name} · /{event.slug}</p>
      <p className="mt-2 text-ink/70">{counts.photos} fotos · {counts.families} familias · {counts.guests} registros de invitados · {counts.sessions} sesiones</p>
      <p className="mt-4">Las nuevas cargas están bloqueadas hasta completar la configuración.</p>
      {!choice ? <div className="mt-6 flex flex-wrap gap-3">
        <button onClick={() => setChoice("keep")} className="rounded-sm bg-bronze px-4 py-3 text-ivory">Conservar lo existente</button>
        <button onClick={() => setChoice("delete")} className="rounded-sm border border-ink/30 px-4 py-3">Eliminar y configurar de nuevo</button>
      </div> : <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
        {choice === "keep" ? <>
          <p>Se conservan tus fotos, familias, tokens, RSVP y cupos. La modalidad sigue siendo invitaciones por familia.</p>
          <label className="flex flex-col gap-2">Fecha y hora de inicio (Argentina)<input type="datetime-local" required value={starts} onChange={(e) => setStarts(e.target.value)} className="rounded-sm border border-ink/20 bg-ivory p-3" /></label>
          <label className="flex flex-col gap-2">Fecha y hora de reveal (Argentina)<input type="datetime-local" required value={reveal} onChange={(e) => setReveal(e.target.value)} className="rounded-sm border border-ink/20 bg-ivory p-3" /></label>
          <p className="text-sm text-ink/70">El reveal debe ser desde el mediodía del segundo día posterior al evento. Confirmá la fecha sugerida; el contenido de la invitación sigue en código.</p>
          <p className="text-sm text-ink/70">El consumo anterior se reconstruye con fotos y sesiones disponibles. No se pueden recuperar cargas borradas sin historial.</p>
        </> : <>
          <p>Borra todas las fotos del evento en Cloudinary y sus datos. Los enlaces y QR actuales dejan de funcionar. Esta acción no se puede deshacer.</p>
          {event.deletion_pending && <p role="alert">Hay un borrado pendiente. Reintentá para completar la limpieza; se conservan las referencias.</p>}
          <label className="flex flex-col gap-2">Escribí BORRAR TODO para confirmar<input required value={confirmation} onChange={(e) => setConfirmation(e.target.value)} autoComplete="off" className="rounded-sm border border-ink/20 bg-ivory p-3" /></label>
        </>}
        {error && <p role="alert">{error}</p>}
        <div className="flex gap-3">
          <button disabled={busy || (choice === "delete" && confirmation !== "BORRAR TODO")} className="rounded-sm bg-bronze px-4 py-3 text-ivory disabled:opacity-50">{busy ? "Procesando…" : choice === "keep" ? "Confirmar y conservar" : "Borrar y configurar de nuevo"}</button>
          {!event.deletion_pending && <button type="button" disabled={busy} onClick={() => { setChoice(null); setError(null); setConfirmation(""); }} className="rounded-sm border border-ink/20 px-4 py-3">Cancelar</button>}
        </div>
      </form>}
    </div>
  </main>;
}
