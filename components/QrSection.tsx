"use client";

import { useEffect, useRef, useState } from "react";

type QrTable = { table_number: number; qr_token: string };

export function QrSection({ slug }: { slug: string }) {
  const [tables, setTables] = useState<QrTable[] | null>(null);
  const [selected, setSelected] = useState<QrTable | null>(null);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [qrBusy, setQrBusy] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const base = typeof window !== "undefined" ? window.location.origin : "";
  const qrUrl = (token: string) => `${base}/${slug}/upload?qr=${token}`;
  const inviteUrl = (token: string) => `${base}/${slug}?token=${token}`;

  useEffect(() => {
    fetch("/api/admin/tables")
      .then((r) => r.json())
      .then((d: { tables?: QrTable[] }) => setTables(d.tables ?? []))
      .catch(() => setTables([]));
  }, []);

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

  function openQr(table: QrTable) {
    setSelected(table);
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
    a.download = `qr-mesa-${selected.table_number}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function printSelected() {
    if (!selected || !qrImage) return;
    const title = `QR Mesa ${selected.table_number}`.replace(/[<>&"]/g, "");
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
    <section className="mb-8 rounded-sm border border-ink/10 bg-ivory p-4">
      <h2 className="font-sans text-xs tracking-[0.2em] text-bronze uppercase">
        QRs e invitaciones ({tables.length} mesas)
      </h2>
      <div className="mt-3 flex flex-col gap-2">
        {tables.map((t) => (
          <div
            key={t.table_number}
            className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-ink/10 px-3 py-2"
          >
            <div className="min-w-0">
              <p className="font-sans text-base text-ink">Mesa {t.table_number}</p>
              <p className="truncate font-mono text-xs text-ink/55">
                {inviteUrl(t.qr_token)}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(inviteUrl(t.qr_token));
                }}
                className="rounded-sm border border-ink/20 px-3 py-1.5 text-sm text-ink"
              >
                Copiar link
              </button>
              <button
                type="button"
                onClick={() => openQr(t)}
                className="rounded-sm bg-bronze px-3 py-1.5 text-sm text-ivory"
              >
                QR mesa
              </button>
            </div>
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
              QR Mesa {selected.table_number}
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
                  alt={`Código QR de la mesa ${selected.table_number}`}
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
    </section>
  );
}
