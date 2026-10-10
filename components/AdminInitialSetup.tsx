"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { argentinaInput, argentinaInstant, eventSchedule } from "@/lib/setup-policy";
import { DEFAULT_INVITATION_MESSAGE, DEFAULT_INVITATION_CONTACT, invitationSettingsSchema, familyInvitationLink, renderInvitationMessage } from "@/lib/invitation-message";
import { InvitationSettingsFields } from "@/components/InvitationSettingsFields";
import { useBrowserOrigin } from "@/components/useBrowserOrigin";

type Family = { name: string; max_photos: number };
const inputClass = "min-w-0 rounded-sm border border-ink/20 bg-ivory px-3 py-2 text-base text-ink";

export function AdminInitialSetup({ suggestedStart, slug }: { suggestedStart: string; slug: string }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<"invitations" | "public_qr">("invitations");
  const [message, setMessage] = useState(DEFAULT_INVITATION_MESSAGE);
  const [contact, setContact] = useState(DEFAULT_INVITATION_CONTACT);
  const [previewIndex, setPreviewIndex] = useState(0);
  const origin = useBrowserOrigin();
  const [name, setName] = useState("");
  const [starts, setStarts] = useState(argentinaInput(suggestedStart));
  const [reveal, setReveal] = useState(argentinaInput(eventSchedule(suggestedStart).min_reveal_at));
  const [defaultLimit, setDefaultLimit] = useState(24);
  const [families, setFamilies] = useState<Family[]>([{ name: "Familia 1", max_photos: 24 }]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previewFamily = {name: families[Math.min(previewIndex, families.length - 1)].name, link: familyInvitationLink(origin, slug, "token-de-ejemplo")};

  function resize(count: number) {
    if (!Number.isInteger(count) || count < 1 || count > 500) return;
    setFamilies((current) => Array.from({ length: count }, (_, i) => current[i] ?? { name: `Familia ${i + 1}`, max_photos: defaultLimit }));
  }
  function updateFamily(index: number, patch: Partial<Family>) {
    setFamilies((current) => current.map((f, i) => i === index ? { ...f, ...patch } : f));
  }
  function format(value: string) {
    return new Date(value).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" });
  }
  function schedule() { return eventSchedule(argentinaInstant(starts)); }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    if (busy) return;
    try {
      if (new Date(argentinaInstant(reveal)) < new Date(schedule().min_reveal_at)) throw new Error("El reveal debe ser desde el mediodía del segundo día posterior al evento.");
      if (mode === "invitations") {
        const parsed = invitationSettingsSchema.safeParse({invitation_message: message, invitation_contact: contact});
        if (!parsed.success) throw new Error(parsed.error.issues[0].message);
      }
      if (step < 3) { setStep(mode === "public_qr" ? 3 : step + 1); return; }
      setBusy(true);
      const response = await fetch("/api/admin/setup", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, starts_at: argentinaInstant(starts), reveal_at: argentinaInstant(reveal), access_mode: mode, max_photos_per_session: defaultLimit, ...(mode === "invitations" ? { families, invitation_message: message, invitation_contact: contact } : {}) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo crear el evento");
      router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "No se pudo crear el evento"); }
    finally { setBusy(false); }
  }

  return <main className="admin-scroll min-h-dvh bg-cream px-6 py-10 sm:py-16">
    <div className="mx-auto max-w-3xl">
      <h1 className="font-serif text-4xl text-ink">Configurar el evento</h1>
      <p className="mt-2 text-ink/70">Paso {mode === "public_qr" && step === 3 ? 2 : step} de {mode === "public_qr" ? 2 : 3} · {step === 1 ? "Datos del evento" : step === 2 ? "Familias y QR" : "Revisar y crear"}</p>
      <form onSubmit={submit} className="mt-8 flex flex-col gap-5">
        {step === 1 && <>
          <label className="flex flex-col gap-2">Nombre del evento<input required maxLength={255} value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Boda Daniela y Miguel" /></label>
          <p className="text-sm text-ink/70">Este nombre figura en el admin. No cambia el contenido de la invitación. Enlace del evento: /{slug}.</p>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="flex flex-col gap-2">Fecha y hora de inicio (Argentina)<input type="datetime-local" required value={starts} onChange={(e) => setStarts(e.target.value)} className={inputClass} /></label>
            <label className="flex flex-col gap-2">Fecha y hora de reveal (Argentina)<input type="datetime-local" required value={reveal} onChange={(e) => setReveal(e.target.value)} className={inputClass} /></label>
          </div>
          <p className="text-sm text-ink/70">La carga abre al mediodía del día del evento y cierra al mediodía siguiente. El reveal puede empezar desde el mediodía del segundo día posterior.</p>
          <label className="flex flex-col gap-2">Límite predeterminado de fotos<input type="number" required min={1} max={100} value={defaultLimit} onChange={(e) => {
            const next = Number(e.target.value);
            setDefaultLimit(next);
            setFamilies((current) => current.map((f) => f.max_photos === defaultLimit ? {...f, max_photos: next} : f));
          }} className={`${inputClass} w-28`} /></label>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2">Modalidad</legend>
            <label className="flex items-center gap-2"><input type="radio" name="mode" checked={mode === "invitations"} onChange={() => setMode("invitations")} />Invitaciones por familia</label>
            <label className="flex items-center gap-2"><input type="radio" name="mode" checked={mode === "public_qr"} onChange={() => setMode("public_qr")} />QR único, sin invitaciones ni RSVP</label>
            {mode === "public_qr" && <p className="text-sm text-ink/70">El cupo es por sesión del navegador. Borrar sus datos o usar otro navegador crea otra sesión; no identifica infaliblemente un dispositivo.</p>}
            <p className="text-sm text-ink/70">La modalidad no se puede cambiar después de crear el evento.</p>
          </fieldset>
          {mode === "invitations" && <>
            <InvitationSettingsFields message={message} contact={contact} onMessage={setMessage} onContact={setContact} previewName={previewFamily.name} previewLink={previewFamily.link} />
            <p className="text-sm text-ink/60">El enlace de esta vista previa es de ejemplo. Los enlaces definitivos se generan al crear las familias.</p>
          </>}
        </>}
        {step === 2 && <>
          <label className="flex flex-col gap-2">Cantidad inicial de familias / QR<input type="number" required min={1} max={500} value={families.length} onChange={(e) => resize(Number(e.target.value))} className={`${inputClass} w-28`} /></label>
          <p className="text-sm text-ink/70">Antes de que abra la carga podés agregar o eliminar familias. Si ya tienen actividad, se pausa su QR y se conservan sus datos. Desde la apertura solo podés pausar o reactivar accesos.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left"><caption className="sr-only">Configuración inicial de familias</caption><thead><tr className="border-b border-ink/20"><th scope="col" className="py-3 pr-3">Número</th><th scope="col" className="py-3 pr-3">Nombre de familia</th><th scope="col" className="py-3">Fotos</th></tr></thead>
              <tbody>{families.map((f, i) => <tr key={i} className="border-b border-ink/10">
                <td className="py-2 pr-3">{i + 1}</td>
                <td className="py-2 pr-3"><input aria-label={`Nombre de familia ${i + 1}`} required maxLength={100} value={f.name} onChange={(e) => updateFamily(i, {name: e.target.value})} className={`${inputClass} w-full`} /></td>
                <td className="py-2"><input aria-label={`Cupo de familia ${i + 1}`} type="number" required min={1} max={100} value={f.max_photos} onChange={(e) => updateFamily(i, {max_photos: Number(e.target.value)})} className={`${inputClass} w-24`} /></td>
              </tr>)}</tbody>
            </table>
          </div>
          <label className="flex flex-col gap-2">Vista previa del mensaje por familia
            <select value={Math.min(previewIndex, families.length - 1)} onChange={(e) => setPreviewIndex(Number(e.target.value))} className={inputClass}>
              {families.map((family, i) => <option key={i} value={i}>{i + 1}. {family.name}</option>)}
            </select>
          </label>
          <p className="whitespace-pre-wrap break-words rounded-sm border border-ink/15 bg-ivory p-3 text-sm">{renderInvitationMessage(message, families[Math.min(previewIndex, families.length - 1)].name, previewFamily.link)}</p>
          <p className="text-sm text-ink/60">El enlace es de ejemplo; cada familia tendrá su propio token al crear el evento.</p>
        </>}
        {step === 3 && <>
          <h2 className="font-serif text-2xl">{name}</h2>
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-3">
            <dt>Modalidad</dt><dd>{mode === "invitations" ? "Invitaciones por familia" : "QR único"}</dd>
            <dt>Inicio</dt><dd>{format(argentinaInstant(starts))}</dd>
            <dt>Carga de fotos</dt><dd>{format(schedule().upload_starts_at)} — {format(schedule().upload_ends_at)}</dd>
            <dt>Reveal</dt><dd>{format(argentinaInstant(reveal))}</dd>
            <dt>Cupo predeterminado</dt><dd>{defaultLimit} fotos</dd>
            <dt>{mode === "invitations" ? "Familias / QR" : "QR compartido"}</dt><dd>{mode === "invitations" ? families.length : 1}</dd>
          </dl>
          {mode === "invitations" ? <>
            <ul className="max-h-72 overflow-y-auto border-y border-ink/20 py-3">{families.map((f, i) => <li key={i} className="py-1">{i + 1}. {f.name} · {f.max_photos} fotos</li>)}</ul>
            <p className="text-sm text-ink/70">Se crean todas las familias con sus enlaces y QR. La modalidad queda fijada; los cupos y familias quedan bloqueados desde la apertura de carga.</p>
            <p className="whitespace-pre-wrap break-words rounded-sm border border-ink/15 bg-ivory p-3 text-sm">{renderInvitationMessage(message, families[0].name, previewFamily.link)}</p>
            <p className="break-all text-sm">Contacto para cambios: {contact}</p>
          </> : <p className="text-sm text-ink/70">Se crea un QR para todo el álbum, sin familias ni RSVP. Cada navegador tiene un cupo de {defaultLimit} fotos. La modalidad queda fijada.</p>}
        </>}
        {error && <p role="alert" className="text-ink">{error}</p>}
        <div className="flex flex-wrap gap-3">
          {step > 1 && <button type="button" disabled={busy} onClick={() => { setStep(mode === "public_qr" ? 1 : step - 1); setError(null); }} className="rounded-sm border border-ink/20 px-5 py-3">Volver</button>}
          <button disabled={busy} className="rounded-sm bg-bronze px-5 py-3 text-ivory disabled:opacity-50">{busy ? "Creando…" : step === 3 ? "Crear evento" : "Continuar"}</button>
        </div>
      </form>
    </div>
  </main>;
}
