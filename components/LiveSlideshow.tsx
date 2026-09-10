"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Props = { slug: string; interval: number; projectionEnabled: boolean };

type Photo = { id: string; cloudinary_url: string; thumbnail_url: string; created_at: string };

export function LiveSlideshow({ slug, interval, projectionEnabled }: Props) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [liveProjectionEnabled, setLiveProjectionEnabled] = useState(projectionEnabled);
  const [speed, setSpeed] = useState(interval);
  const [connected, setConnected] = useState(true);
  const [cycle, setCycle] = useState(0); // cualquier control reinicia el timer

  const photosRef = useRef<Photo[]>([]);
  photosRef.current = photos;

  // Carga inicial + refresh cuando llegan fotos nuevas
  const load = useCallback(
    async (after?: string) => {
      const url = after
        ? `/api/photos?slug=${slug}&after=${encodeURIComponent(after)}`
        : `/api/photos?slug=${slug}`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = (await res.json()) as { photos?: Photo[] };
      if (data.photos?.length) {
        setPhotos((p) => [...p, ...data.photos!]);
      }
    },
    [slug],
  );

  useEffect(() => {
    load();
  }, [load]);

  // auto-avance (loop cada `speed` segundos, con 2+ fotos)
  // `cycle` reinicia el timer en cada cambio (manual o automático)
  useEffect(() => {
    if (paused || !liveProjectionEnabled || photos.length < 2) return;
    setIndex((i) => i % photos.length); // re-alinear si el índice quedó mayor que la lista
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % photos.length);
      setCycle((c) => c + 1);
    }, speed * 1000);
    return () => clearInterval(t);
  }, [paused, liveProjectionEnabled, speed, photos.length, cycle]);

  // SSE: fotos nuevas (append, sin resetear índice) + controles de admin
  useEffect(() => {
    const connect = () => {
      const es = new EventSource("/api/photos/stream");

      es.addEventListener("new_photos", () => {
        const p = photosRef.current;
        const after = p.length ? p[p.length - 1].created_at : undefined;
        load(after);
      });

      es.addEventListener("slideshow", (ev) => {
        const c = JSON.parse((ev as MessageEvent).data) as {
          action: string;
          value?: number;
          enabled?: boolean;
        };
        const len = Math.max(photosRef.current.length, 1);
        if (c.action === "pause") {
          setPaused(true);
          setCycle((n) => n + 1);
        }
        if (c.action === "resume") setPaused(false);
        if (c.action === "projection") {
          setLiveProjectionEnabled(c.enabled !== false);
          setCycle((n) => n + 1);
        }
        if (c.action === "next") {
          setIndex((i) => (i + 1) % len);
          setCycle((n) => n + 1);
        }
        if (c.action === "prev") {
          setIndex((i) => (i - 1 + len) % len);
          setCycle((n) => n + 1);
        }
        if (c.action === "speed" && c.value) setSpeed(c.value);
      });

      es.onerror = () => setConnected(false);
      es.onopen = () => {
        setConnected(true);
        // al reconectar refrescar lo que pudo haber entrado durante la caída
        const p = photosRef.current;
        load(p.length ? p[p.length - 1].created_at : undefined);
      };
      return es;
    };

    let es = connect();
    return () => es.close();
  }, [slug, load]);

  const current = photos[index];

  void current;

  return (
    <div className="fixed inset-0 bg-black text-white">
      {photos.length > 0 ? (
        <div className="relative h-full w-full">
          {photos.map((p, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={p.id}
              src={p.cloudinary_url}
              alt={i === index ? "Foto del evento" : ""}
              aria-hidden={i !== index}
              className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-1000 ease-out ${
                i === index ? "z-10 opacity-100" : "z-0 opacity-0"
              }`}
              loading={i <= index + 2 ? "eager" : "lazy"}
            />
          ))}
        </div>
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-4">
          <p className="font-sans text-2xl tracking-[0.3em] uppercase opacity-70">
            Nuestra boda
          </p>
          <p className="font-sans text-lg opacity-40">
            Esperando las primeras fotos…
          </p>
        </div>
      )}

      {!connected && (
        <div className="absolute bottom-6 right-6 rounded-sm bg-white/10 px-3 py-1.5 font-sans text-sm">
          Reconectando…
        </div>
      )}
      {!liveProjectionEnabled && photos.length > 0 && (
        <div className="absolute bottom-6 left-6 rounded-sm bg-white/10 px-3 py-1.5 font-sans text-sm">
          Proyección pausada por el organizador
        </div>
      )}
      {paused && liveProjectionEnabled && photos.length > 0 && (
        <div className="absolute bottom-6 left-6 rounded-sm bg-white/10 px-3 py-1.5 font-sans text-sm">
          Pausado
        </div>
      )}
    </div>
  );
}
