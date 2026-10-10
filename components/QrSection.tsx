"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CopyButton } from "@/components/CopyButton";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { DEFAULT_INVITATION_MESSAGE, DEFAULT_INVITATION_CONTACT, invitationSettingsSchema, familyInvitationLink, renderInvitationMessage } from "@/lib/invitation-message";
import { InvitationSettingsFields } from "@/components/InvitationSettingsFields";
import { useBrowserOrigin } from "@/components/useBrowserOrigin";

type QrTable = { table_number: number; qr_token: string; guest_name: string | null; max_photos: number };

async function fetchTables(): Promise<QrTable[]> {
  const response = await fetch("/api/admin/tables");
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "No se pudo cargar familias");
  return data.tables ?? [];
}

export function QrSection({ slug, invitationMessage, invitationContact }: { slug: string; invitationMessage?: string | null; invitationContact?: string | null }) {
  const [savedMessage, setSavedMessage] = useState(invitationMessage ?? DEFAULT_INVITATION_MESSAGE);
  const [message, setMessage] = useState(savedMessage);
  const [contact, setContact] = useState(invitationContact ?? DEFAULT_INVITATION_CONTACT);
  const [previewNumber, setPreviewNumber] = useState<number | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsNotice, setSettingsNotice] = useState<string | null>(null);
  const [tables, setTables] = useState<QrTable[] | null>(null);
  const [selected, setSelected] = useState<QrTable | null>(null);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [qrBusy, setQrBusy] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const [mutating, setMutating] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const base = useBrowserOrigin();
  const qrUrl = (token: string) => `${base}/${slug}/upload?qr=${token}`;
  const inviteUrl = (token: string) => familyInvitationLink(base, slug, token);

  async function saveSettings(event: React.FormEvent) {
    event.preventDefault();
    if (savingSettings) return;
    setSettingsNotice(null);
    const parsed = invitationSettingsSchema.safeParse({invitation_message: message, invitation_contact: contact});
    if (!parsed.success) { setSettingsNotice(parsed.error.issues[0].message); return; }
    setSavingSettings(true);
    try {
      const response = await fetch("/api/admin/invitation", {method: "PUT", headers: {"Content-Type": "application/json"}, body: JSON.stringify(parsed.data)});
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo guardar la invitación");
      setSavedMessage(data.invitation_message); setMessage(data.invitation_message); setContact(data.invitation_contact);
      setSettingsNotice("Mensaje y contacto guardados. Los enlaces y QR se conservan.");
    } catch (error) { setSettingsNotice(error instanceof Error ? error.message : "No se pudo guardar la invitación"); }
    finally { setSavingSettings(false); }
  }

  const loadTables = useCallback(async () => {
    try {
      setTables(await fetchTables());
      setListError(null);
    } catch (e) {
      setListError(e instanceof Error ? e.message : "No se pudo cargar familias");
      setTables([]);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetchTables().then((families) => {
      if (cancelled) return;
      setTables(families);
      setListError(null);
    }).catch((error: unknown) => {
      if (cancelled) return;
      setListError(error instanceof Error ? error.message : "No se pudo cargar familias");
      setTables([]);
    });
    // recarga cuando otro panel cambia familias/nombres
    const onChange = () => void loadTables();
    window.addEventListener("qr:tables-changed", onChange);
    return () => {
      cancelled = true;
      window.removeEventListener("qr:tables-changed", onChange);
    };
  }, [loadTables]);

  async function addTable() {
    setMutating(true);
    setListError(null);
    try {
      const r = await fetch("/api/admin/tables", { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "No se pudo agregar la familia");
      await loadTables();
    } catch (e) {
      setListError(e instanceof Error ? e.message : "No se pudo agregar la familia");
    } finally {
      setMutating(false);
    }
  }

  async function removeTable(table_number: number) {
    if (!confirm(`¿Eliminar la familia ${table_number}?`)) return;
    setMutating(true);
    setListError(null);
    try {
      const r = await fetch("/api/admin/tables", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table_number }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error ?? "No se pudo eliminar la familia");
      await loadTables();
    } catch (e) {
      setListError(e instanceof Error ? e.message : "No se pudo eliminar la familia");
    } finally {
      setMutating(false);
    }
  }

  async function updateLimit(table_number: number, max_photos: number) {
    if (!Number.isFinite(max_photos) || max_photos < 1 || max_photos > 100) return;
    setTables((prev) => prev ? prev.map((t) => t.table_number === table_number ? { ...t, max_photos } : t) : prev);
    try {
      const r = await fetch("/api/admin/tables", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table_number, max_photos }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error ?? "No se pudo actualizar el límite");
    } catch (e) {
      setListError(e instanceof Error ? e.message : "No se pudo actualizar el límite");
      await loadTables();
    }
  }

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    const url = qrUrl(selected.qr_token);

    async function generate() {
      setQrBusy(true);
      setQrError(null);
      setQrImage(null);
      try {
        const QRCode = await import("qrcode");
        const image = await QRCode.toDataURL(url, { width: 1024, margin: 2 });
        if (!cancelled) setQrImage(image);
      } catch {
        if (!cancelled) setQrError("No se pudo generar el QR.");
      } finally {
        if (!cancelled) setQrBusy(false);
      }
    }

    generate();
    closeRef.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
    };
    document.addEventListener("keydown", onKey);

    const scroller = document.querySelector(".admin-scroll");
    const previousOverflow =
      scroller instanceof HTMLElement ? scroller.style.overflow : "";
    if (scroller instanceof HTMLElement) scroller.style.overflow = "hidden";

    return () => {
      cancelled = true;
      document.removeEventListener("keydown", onKey);
      if (scroller instanceof HTMLElement) {
        scroller.style.overflow = previousOverflow;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  if (!tables) return null;
  const previewTable = tables.find((table) => table.table_number === previewNumber) ?? tables[0];

  function openQr(table: QrTable) {
    setSelected(table);
  }

  function buildMessage(table: QrTable) {
    return renderInvitationMessage(savedMessage, table.guest_name ?? `Familia ${table.table_number}`, inviteUrl(table.qr_token));
  }

  function closeQr() {
    setSelected(null);
    setQrImage(null);
    setQrError(null);
    setQrBusy(false);
  }

  function downloadSelected() {
    if (!selected || !qrImage) return;
    const a = document.createElement("a");
    a.href = qrImage;
    a.download = `qr-familia-${selected.table_number}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function printSelected() {
    if (!selected || !qrImage) return;
    const title = `QR Familia ${selected.table_number}`.replace(/[<>&"]/g, "");
    const url = qrUrl(selected.qr_token);
    const printWindow = window.open("", "_blank", "width=640,height=760");
    if (!printWindow) {
      setQrError("Permití ventanas emergentes para imprimir el QR.");
      return;
    }
    printWindow.document.write(`<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>${title}</title>
<style>
body { font-family: Arial, sans-serif; text-align: center; padding: 32px; color: #111; }
img { width: 430px; max-width: 100%; height: auto; margin: 24px auto; display: block; }
p { font-size: 14px; word-break: break-all; }
</style>
</head>
<body>
<h1>${title}</h1>
<img src="${qrImage}" alt="${title}" onload="window.focus(); window.print()" />
<p>${url}</p>
</body>
</html>`);
    printWindow.document.close();
  }

  return (
    <CollapsibleSection
      title="QRs e invitaciones"
      count={`${tables.length} familias`}
      defaultOpen={false}
      actions={
        <button
          type="button"
          onClick={addTable}
          disabled={mutating}
          className="rounded-sm bg-bronze px-3 py-1.5 text-sm text-ivory disabled:opacity-60"
        >
          {mutating ? "…" : "＋ Familia"}
        </button>
      }
    >
      <form onSubmit={saveSettings} className="mb-6 flex flex-col gap-4 border-b border-ink/15 pb-6">
        <h3 className="font-serif text-2xl">Mensaje y contacto de invitaciones</h3>
        {tables.length > 0 && <label className="flex flex-col gap-2 text-sm">Familia para la vista previa
          <select value={previewTable.table_number} onChange={(e) => setPreviewNumber(Number(e.target.value))} className="rounded-sm border border-ink/20 bg-ivory p-3">
            {tables.map((table) => <option key={table.table_number} value={table.table_number}>{table.guest_name ?? `Familia ${table.table_number}`}</option>)}
          </select>
        </label>}
        <InvitationSettingsFields message={message} contact={contact} onMessage={setMessage} onContact={setContact} disabled={savingSettings}
          previewName={previewTable?.guest_name ?? `Familia ${previewTable?.table_number ?? 1}`}
          previewLink={inviteUrl(previewTable?.qr_token ?? "token-de-ejemplo")} />
        <p className="text-sm text-ink/60">Guardá los cambios para usarlos en los botones Copiar mensaje de cada familia. No se envían mensajes automáticamente.</p>
        {settingsNotice && <p role="status" className="text-sm">{settingsNotice}</p>}
        <button disabled={savingSettings} className="self-start rounded-sm bg-bronze px-4 py-2 text-ivory disabled:opacity-50">{savingSettings ? "Guardando…" : "Guardar mensaje y contacto"}</button>
      </form>
      {listError && (
        <p role="alert" className="mb-2 font-sans text-sm text-ink/80">
          {listError}
        </p>
      )}
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {tables.map((t) => (
            <div
              key={t.table_number}
              className="flex min-w-0 flex-col gap-2 rounded-sm border border-ink/10 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="font-sans text-base text-ink">
                  {t.guest_name ?? `Familia ${t.table_number}`}
                  <button
                    type="button"
                    onClick={() => removeTable(t.table_number)}
                    disabled={mutating}
                    aria-label={`Eliminar familia ${t.table_number}`}
                    className="ml-2 text-sm text-ink/40 hover:text-ink disabled:opacity-60"
                  >
                    ×
                  </button>
                </p>
                <p className="truncate font-mono text-xs text-ink/55">
                  {inviteUrl(t.qr_token)}
                </p>
                <label className="mt-2 flex items-center gap-2 font-sans text-xs text-ink/60">
                  Límite
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={t.max_photos}
                    onChange={(e) => updateLimit(t.table_number, Number(e.target.value))}
                    className="w-16 rounded-sm border border-ink/15 bg-ivory px-2 py-1 text-sm text-ink [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span>fotos</span>
                </label>
              </div>
              <div className="flex gap-2">
                <CopyButton
                  text={inviteUrl(t.qr_token)}
                  className="flex-1 rounded-sm border border-ink/20 px-3 py-1.5 text-sm text-ink"
                >
                  Copiar link
                </CopyButton>
                <CopyButton
                  text={buildMessage(t)}
                  className="flex-1 rounded-sm border border-bronze px-3 py-1.5 text-sm text-bronze"
                >
                  Copiar mensaje
                </CopyButton>
                <button
                  type="button"
                  onClick={() => openQr(t)}
                  className="flex-1 rounded-sm bg-bronze px-3 py-1.5 text-sm text-ivory"
                >
                  QR familia
                </button>
              </div>
              <details className="text-sm text-ink/70"><summary className="cursor-pointer">Ver mensaje para copiar</summary><p className="mt-2 whitespace-pre-wrap break-words">{buildMessage(t)}</p></details>
            </div>
          ))}
        </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4"
          onClick={closeQr}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="qr-modal-title"
            className="w-full max-w-sm rounded-sm bg-ivory p-5 text-center"
            onClick={(event) => event.stopPropagation()}
          >
            <h3
              id="qr-modal-title"
              className="font-serif text-3xl text-ink"
            >
              QR Familia {selected.table_number}
            </h3>
            <p className="mt-1 break-all font-mono text-xs text-ink/55">
              {qrUrl(selected.qr_token)}
            </p>
            <div className="mt-4 flex min-h-64 items-center justify-center">
              {qrBusy && (
                <p className="font-sans text-sm text-ink/55">Generando QR…</p>
              )}
              {qrError && (
                <p role="alert" className="font-sans text-sm text-ink/80">
                  {qrError}
                </p>
              )}
              {qrImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrImage}
                  alt={`Código QR de la familia ${selected.table_number}`}
                  className="h-64 w-64"
                />
              )}
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={downloadSelected}
                disabled={!qrImage}
                className="rounded-sm bg-bronze px-4 py-2 text-sm text-ivory transition-colors hover:bg-bronze/90 disabled:opacity-60"
              >
                Descargar
              </button>
              <button
                type="button"
                onClick={printSelected}
                disabled={!qrImage}
                className="rounded-sm border border-ink/20 bg-ivory px-4 py-2 text-sm text-ink disabled:opacity-60"
              >
                Imprimir
              </button>
              <button
                type="button"
                ref={closeRef}
                onClick={closeQr}
                className="rounded-sm border border-ink/20 bg-ivory px-4 py-2 text-sm text-ink"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </CollapsibleSection>
  );
}
