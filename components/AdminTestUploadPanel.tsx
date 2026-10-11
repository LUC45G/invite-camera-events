"use client";

import { useCallback, useEffect, useState } from "react";
import { GalleryGrid, type GalleryPhoto } from "@/components/GalleryGrid";

type TestRun = { id: string; token: string; status: string; expires_at: string; completed_at: string | null };

export function AdminTestUploadPanel({ slug }: { slug: string }) {
  const [run, setRun] = useState<TestRun | null>(null);
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [qr, setQr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const response = await fetch(`/api/admin/test-upload?slug=${encodeURIComponent(slug)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "No se pudo cargar la prueba");
    setRun(data.run);
    setPhotos(data.photos ?? []);
    if (data.run?.status === "active") {
      const url = new URL(`/${slug}/upload`, window.location.origin);
      url.searchParams.set("qr", data.run.token);
      url.searchParams.set("test", "1");
      const QRCode = await import("qrcode");
      setQr(await QRCode.toDataURL(url.href, { width: 640, margin: 2 }));
    } else setQr(null);
  }, [slug]);

  useEffect(() => { void refresh().catch((e) => setError(e instanceof Error ? e.message : "Error")); }, [refresh]);

  async function action(actionName: "create" | "cancel" | "cleanup") {
    setBusy(true); setError(null);
    try {
      const response = await fetch("/api/admin/test-upload", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, action: actionName, ...(run ? { runId: run.id } : {}) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo actualizar la prueba");
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); }
    finally { setBusy(false); }
  }

  const active = run?.status === "active";
  const cleanupPending = run?.status === "cleanup_pending";
  const visibleRun = run && run.status !== "cancelled";

  return (
    <section className="mb-6 rounded-sm border border-ink/10 bg-ivory p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl text-ink">Prueba de carga</h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink/65">Generá un QR temporal para subir una sola foto sin afectar el evento real. La prueba vence en 30 minutos.</p>
        </div>
        {(!run || run.status === "cancelled") && <button type="button" disabled={busy} onClick={() => void action("create")} className="rounded-sm bg-bronze px-4 py-2 text-sm text-ivory disabled:opacity-60">Mostrar QR de prueba</button>}
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-red-900">{error}</p>}
      {visibleRun && run && (
        <div className="mt-5 grid gap-5 md:grid-cols-[220px_1fr]">
          <div className="text-center">
            {active && qr && <img src={qr} alt="QR temporal para probar la carga" className="mx-auto h-52 w-52" />}
            <p className="mt-2 text-xs text-ink/55">Estado: {run.status}. Vence: {new Date(run.expires_at).toLocaleString("es-AR")}</p>
            {active && <><a href={`/${slug}/upload?qr=${encodeURIComponent(run.token)}&test=1`} target="_blank" rel="noreferrer" className="mt-2 block break-all text-xs text-bronze underline">Abrir enlace de prueba</a><button type="button" disabled={busy} onClick={() => void action("cancel")} className="mt-3 rounded-sm border border-ink/20 px-3 py-1.5 text-xs text-ink disabled:opacity-60">Cancelar prueba</button></>}
          </div>
          <div>
            <h3 className="font-sans text-xs tracking-[0.2em] text-ink/55 uppercase">Galería de prueba</h3>
            {photos.length ? <GalleryGrid photos={photos} /> : <p className="mt-3 text-sm text-ink/55">Subí una foto desde el QR para confirmar que aparece acá.</p>}
          </div>
        </div>
      )}
      {run && run.status !== "cancelled" && <div className="mt-4 rounded-sm border border-bronze/30 bg-bronze/10 p-3 text-sm text-ink">{cleanupPending ? "La limpieza quedó pendiente porque no se pudieron borrar todos los recursos de Cloudinary." : "Cuando termines de revisar la foto, eliminá la prueba y sus recursos."}<button type="button" disabled={busy} onClick={() => void action("cleanup")} className="ml-2 underline disabled:opacity-60">Limpiar fotos de prueba</button></div>}
    </section>
  );
}
