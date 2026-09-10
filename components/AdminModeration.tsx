"use client";

import { useCallback, useState } from "react";
import { QrSection } from "@/components/QrSection";
import {
  AdminDangerPanel,
  AdminEventSettings,
  AdminRsvpPanel,
  AdminStoragePanel,
  useAdminRequest,
} from "@/components/AdminOperations";

type Photo = {
  id: string;
  cloudinary_public_id: string;
  cloudinary_url: string;
  thumbnail_url: string;
  status: string;
  nsfw_score: number | null;
  created_at: string;
};

const SLUG = "nuestra-boda";

export function AdminModeration() {
  const [notification, setNotification] = useState<string | null>(null);
  const [speedDraft, setSpeedDraft] = useState<number | null>(null);
  const [busyPhoto, setBusyPhoto] = useState<string | null>(null);
  const [busyControl, setBusyControl] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const fetchPhotos = useCallback(async (): Promise<{
    photos: Photo[];
    stats: Record<string, number>;
  }> => {
    const res = await fetch(`/api/admin/photos?slug=${SLUG}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "No se pudo cargar fotos");
    const stats: Record<string, number> = {};
    for (const row of data.stats ?? []) stats[row.status] = Number(row.n);
    return { photos: data.photos ?? [], stats };
  }, []);

  const fetchSpeed = useCallback(async (): Promise<number> => {
    try {
      const res = await fetch("/api/admin/slideshow");
      const data = await res.json();
      return typeof data.interval === "number" ? data.interval : 5;
    } catch {
      return 5;
    }
  }, []);

  const {
    data: photoData,
    error: photoError,
    loading: photosLoading,
    refresh: refreshPhotos,
  } = useAdminRequest(fetchPhotos);
  const { data: savedSpeed } = useAdminRequest(fetchSpeed);
  const photos = photoData?.photos ?? [];
  const stats = photoData?.stats ?? {};
  const speed = speedDraft ?? savedSpeed ?? null;

  const act = useCallback(
    async (id: string, action: "approve" | "reject" | "delete") => {
      if (action === "delete" && !confirm("¿Borrar esta foto para siempre?")) {
        return;
      }
      const key = `${id}:${action}`;
      setBusyPhoto(key);
      try {
        const res = await fetch("/api/admin/photos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, action }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          setNotification(d.error ?? "Error");
          return;
        }
        setNotification(
          action === "delete"
            ? "Foto borrada"
            : `Foto ${action === "approve" ? "aprobada" : "rechazada"}`,
        );
        await refreshPhotos();
      } finally {
        setBusyPhoto((current) => (current === key ? null : current));
      }
    },
    [refreshPhotos],
  );

  const control = useCallback(
    async (action: "pause" | "resume" | "next" | "prev" | "speed", value?: number) => {
      setBusyControl(action);
      try {
        const res = await fetch("/api/admin/slideshow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, value }),
        });
        if (res.ok) setNotification(`Slideshow: ${action}${value ? ` ${value}s` : ""}`);
        else setNotification("Error al controlar la proyección");
      } finally {
        setBusyControl((current) => (current === action ? null : current));
      }
    },
    [],
  );

  async function downloadZip() {
    setDownloading(true);
    setNotification(null);
    try {
      const res = await fetch(`/api/admin/export?slug=${SLUG}`);
      if (!res.ok) throw new Error("No se pudo generar el ZIP");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${SLUG}-fotos.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setNotification("ZIP descargado");
    } catch {
      setNotification("Error al descargar el ZIP");
    } finally {
      setDownloading(false);
    }
  }

  const pending = photos.filter((p) => p.status === "pending");
  const approved = photos.filter((p) => p.status === "approved");
  const rejected = photos.filter((p) => p.status === "rejected");

  return (
    <div className="min-h-dvh bg-cream px-4 py-6 sm:px-6">
      <header className="mx-auto mb-6 flex max-w-5xl flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl text-ink">Admin</h1>
          <p className="font-sans text-sm text-ink/55">
            {stats.pending ?? 0} pendientes · {stats.approved ?? 0} aprobadas ·{" "}
            {stats.rejected ?? 0} rechazadas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={downloadZip}
            disabled={downloading}
            className="rounded-sm bg-bronze px-4 py-1.5 font-sans text-sm text-ivory transition-colors hover:bg-bronze/90 disabled:opacity-60"
          >
            {downloading ? "Descargando…" : "Descargar ZIP"}
          </button>
          <button
            type="button"
            onClick={() => {
              void refreshPhotos();
            }}
            disabled={photosLoading}
            className="rounded-sm border border-ink/20 bg-ivory px-4 py-1.5 font-sans text-sm text-ink disabled:opacity-60"
          >
            {photosLoading ? "Actualizando…" : "Actualizar"}
          </button>
          <button
            type="button"
            onClick={async () => {
              await fetch("/api/admin/login", { method: "DELETE" });
              window.location.reload();
            }}
            className="rounded-sm border border-ink/20 bg-ivory px-3 py-1.5 font-sans text-sm text-ink"
          >
            Salir
          </button>
        </div>
      </header>

      {notification && (
        <div className="mx-auto mb-4 max-w-5xl rounded-sm bg-bronze/10 px-4 py-2 text-center font-sans text-sm text-ink">
          {notification}
        </div>
      )}

          {photoError && (
            <p role="alert" className="mx-auto mb-4 max-w-5xl font-sans text-sm text-ink/80">
              {photoError}
            </p>
          )}

      <div className="mx-auto max-w-5xl">
        <AdminRsvpPanel slug={SLUG} />
        <AdminEventSettings slug={SLUG} />
        <AdminStoragePanel slug={SLUG} />
        <QrSection slug={SLUG} />
        {/* Control de proyección */}
        <section className="mb-8 rounded-sm border border-ink/10 bg-ivory p-4">
          <h2 className="font-sans text-xs tracking-[0.2em] text-bronze uppercase">
            Proyección
          </h2>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => control("pause")}
              disabled={busyControl !== null}
              className="rounded-sm border border-ink/20 bg-ivory px-4 py-2 text-base disabled:opacity-60"
            >
              {busyControl === "pause" ? "Pausando…" : "Pausar"}
            </button>
            <button
              type="button"
              onClick={() => control("resume")}
              disabled={busyControl !== null}
              className="rounded-sm border border-ink/20 bg-ivory px-4 py-2 text-base disabled:opacity-60"
            >
              {busyControl === "resume" ? "Reanudando…" : "Reanudar"}
            </button>
            <button
              type="button"
              onClick={() => control("prev")}
              disabled={busyControl !== null}
              className="rounded-sm border border-ink/20 bg-ivory px-4 py-2 text-base disabled:opacity-60"
            >
              {busyControl === "prev" ? "…" : "← Anterior"}
            </button>
            <button
              type="button"
              onClick={() => control("next")}
              disabled={busyControl !== null}
              className="rounded-sm border border-ink/20 bg-ivory px-4 py-2 text-base disabled:opacity-60"
            >
              {busyControl === "next" ? "…" : "Siguiente →"}
            </button>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={2}
                max={60}
                value={speed ?? ""}
                onChange={(e) => setSpeedDraft(Number(e.target.value))}
                className="w-16 rounded-sm border border-ink/20 bg-ivory px-2 py-2 text-base [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-ink/55">segundos</span>
              <button
                type="button"
                disabled={speed === null || busyControl !== null}
                onClick={() => speed !== null && control("speed", speed)}
                className="rounded-sm bg-bronze px-3 py-2 text-base text-ivory disabled:opacity-60"
              >
                {busyControl === "speed" ? "Aplicando…" : "Aplicar"}
              </button>
            </div>
          </div>
        </section>

        {/* Pendientes */}
        <section className="mb-8">
          <h2 className="mb-3 font-sans text-xs tracking-[0.2em] text-bronze uppercase">
            Pendientes ({pending.length})
          </h2>
          {!photosLoading && pending.length === 0 ? (
            <p className="font-sans text-base text-ink/55">Sin fotos pendientes.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {pending.map((p) => (
                <div
                  key={p.id}
                  className="relative overflow-hidden rounded-sm border border-ink/10 bg-ivory"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.thumbnail_url}
                    alt=""
                    className={`aspect-4/3 w-full object-cover ${p.nsfw_score ? "border-2 border-red-800" : ""}`}
                  />
                  {p.nsfw_score !== null && p.nsfw_score !== undefined && (
                    <div className="absolute left-1 top-1 rounded-sm bg-red-900/90 px-1.5 py-0.5 font-sans text-[10px] font-medium tracking-wide text-white">
                      NSFW {Math.round(p.nsfw_score * 100)}%
                    </div>
                  )}
                  <div className="flex gap-1 p-2">
                    <button
                      type="button"
                      onClick={() => act(p.id, "approve")}
                      disabled={busyPhoto !== null}
                      className="flex-1 rounded-sm bg-bronze py-1.5 text-sm text-ivory disabled:opacity-60"
                    >
                      {busyPhoto === `${p.id}:approve` ? "Aprobando…" : "Aprobar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => act(p.id, "reject")}
                      disabled={busyPhoto !== null}
                      className="flex-1 rounded-sm border border-ink/20 py-1.5 text-sm text-ink disabled:opacity-60"
                    >
                      {busyPhoto === `${p.id}:reject` ? "Rechazando…" : "Rechazar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => act(p.id, "delete")}
                      disabled={busyPhoto !== null}
                      className="flex-1 rounded-sm bg-ink/80 py-1.5 text-sm text-ivory disabled:opacity-60"
                    >
                      {busyPhoto === `${p.id}:delete` ? "Borrando…" : "Borrar"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Aprobadas */}
        {approved.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 font-sans text-xs tracking-[0.2em] text-bronze uppercase">
              Aprobadas ({approved.length})
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {approved.map((p) => (
                <div
                  key={p.id}
                  className="relative rounded-sm border border-ink/10 bg-ivory p-1"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.thumbnail_url} alt="" className="aspect-4/3 w-full rounded-sm object-cover" />
                  {p.nsfw_score !== null && p.nsfw_score !== undefined && (
                    <div className="absolute left-2 top-2 rounded-sm bg-red-900/90 px-1.5 py-0.5 font-sans text-[10px] font-medium tracking-wide text-white">
                      NSFW {Math.round(p.nsfw_score * 100)}%
                    </div>
                  )}
                  <div className="flex gap-1 pt-1">
                    <span className="flex-1" />
                    <button
                      type="button"
                      onClick={() => act(p.id, "delete")}
                      disabled={busyPhoto !== null}
                      className="px-2 py-1 text-sm text-ink/60 hover:text-ink disabled:opacity-60"
                    >
                      {busyPhoto === `${p.id}:delete` ? "Borrando…" : "Borrar"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Rechazadas */}
        {rejected.length > 0 && (
          <section>
            <h2 className="mb-3 font-sans text-xs tracking-[0.2em] text-bronze uppercase">
              Rechazadas ({rejected.length})
            </h2>
            <div className="grid grid-cols-2 gap-3 opacity-50 sm:grid-cols-3 md:grid-cols-4">
              {rejected.map((p) => (
                <div
                  key={p.id}
                  className="rounded-sm border border-ink/10 bg-ivory p-1"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.thumbnail_url}
                    alt=""
                    className="aspect-4/3 w-full rounded-sm object-cover grayscale"
                  />
                  <div className="flex gap-1 pt-1">
                    <button
                      type="button"
                      onClick={() => act(p.id, "approve")}
                      disabled={busyPhoto !== null}
                      className="flex-1 rounded-sm bg-bronze/90 py-1 text-sm text-ivory disabled:opacity-60"
                    >
                      {busyPhoto === `${p.id}:approve` ? "Aprobando…" : "Aprobar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => act(p.id, "delete")}
                      disabled={busyPhoto !== null}
                      className="flex-1 rounded-sm bg-ink/80 py-1 text-sm text-ivory disabled:opacity-60"
                    >
                      {busyPhoto === `${p.id}:delete` ? "Borrando…" : "Borrar"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <AdminDangerPanel slug={SLUG} />
      </div>
    </div>
  );
}
