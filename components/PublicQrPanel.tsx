"use client";

import { useEffect, useState } from "react";
import { CopyButton } from "@/components/CopyButton";
import { CollapsibleSection } from "@/components/CollapsibleSection";

export function PublicQrPanel({ slug, token, limit }: { slug: string; token: string; limit: number }) {
  const [qr, setQr] = useState<{ image: string; url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedLimit, setSavedLimit] = useState(limit);
  const [draftLimit, setDraftLimit] = useState(limit);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    const url = new URL(`/${slug}/upload?qr=${encodeURIComponent(token)}`, window.location.origin).href;
    void import("qrcode").then(async (module) => ({ image: await module.toDataURL(url, { width: 1024, margin: 2 }), url }))
      .then((result) => { if (!cancelled) setQr(result); })
      .catch(() => { if (!cancelled) setError("No se pudo generar el QR. Recargá el panel para reintentar."); });
    return () => { cancelled = true; };
  }, [slug, token]);

  function download() {
    if (!qr) return;
    const anchor = document.createElement("a");
    anchor.href = qr.image; anchor.download = `qr-${slug}.png`; anchor.click();
  }
  async function saveLimit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true); setNotice(null);
    try {
      const response = await fetch("/api/admin/event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({slug, max_photos_per_session: draftLimit}) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo guardar el cupo");
      setSavedLimit(data.event.max_photos_per_session); setNotice("Cupo guardado. No reinicia el consumo de las sesiones existentes.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "No se pudo guardar el cupo"); }
    finally { setSaving(false); }
  }
  function print() {
    if (!qr) return;
    const popup = window.open("", "_blank", "width=640,height=760");
    if (!popup) { setError("Permití ventanas emergentes para imprimir el QR."); return; }
    popup.document.title = "QR para cargar fotos";
    const heading = popup.document.createElement("h1"); heading.textContent = "Escaneá para cargar fotos";
    const image = popup.document.createElement("img"); image.alt = heading.textContent;
    image.style.cssText = "width:430px;max-width:100%;height:auto";
    image.onload = () => { popup.focus(); popup.print(); };
    image.src = qr.image;
    const link = popup.document.createElement("p"); link.textContent = qr.url; link.style.wordBreak = "break-all";
    popup.document.body.style.cssText = "font-family:Arial,sans-serif;text-align:center;padding:32px";
    popup.document.body.append(heading, image, link);
  }

  return <CollapsibleSection title="QR único" defaultOpen>
    <p className="text-sm text-ink/70">Compartí este QR para cargar fotos al mismo álbum, sin invitación ni RSVP. Cada sesión tiene un cupo de {savedLimit} fotos.</p>
    <p className="mt-2 text-sm text-ink/70">El cupo corresponde a la sesión del navegador: borrar sus datos o usar otro navegador permite crear otra sesión. No identifica infaliblemente un dispositivo.</p>
    <form onSubmit={saveLimit} className="mt-4 flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-2 text-sm">Fotos por sesión<input type="number" required min={1} max={100} value={draftLimit} onChange={(e) => setDraftLimit(Number(e.target.value))} className="w-24 rounded-sm border border-ink/20 bg-ivory px-3 py-2" /></label>
      <button disabled={saving} className="rounded-sm border border-ink/20 px-4 py-2 disabled:opacity-50">{saving ? "Guardando…" : "Guardar cupo"}</button>
    </form>
    {notice && <p role="status" className="mt-2 text-sm">{notice}</p>}
    {error && <p role="alert" className="mt-3">{error}</p>}
    {qr ? <>
      {/* QR generated locally, already a PNG data URL. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={qr.image} alt="QR único para cargar fotos al álbum" className="my-4 h-64 w-64 max-w-full" />
      <p className="break-all font-mono text-xs text-ink/60">{qr.url}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <CopyButton text={qr.url} className="rounded-sm border border-ink/20 px-4 py-2">Copiar enlace</CopyButton>
        <button onClick={download} className="rounded-sm bg-bronze px-4 py-2 text-ivory">Descargar QR</button>
        <button onClick={print} className="rounded-sm border border-ink/20 px-4 py-2">Imprimir QR</button>
      </div>
    </> : !error && <p className="mt-4">Generando QR…</p>}
  </CollapsibleSection>;
}
