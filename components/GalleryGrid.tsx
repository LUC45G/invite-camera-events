"use client";

import Image from "next/image";
import { useState } from "react";

export type GalleryPhoto = {
  id: string;
  cloudinary_url: string;
  thumbnail_url: string;
};

export function GalleryGrid({ photos }: { photos: GalleryPhoto[] }) {
  const [active, setActive] = useState<GalleryPhoto | null>(null);
  const [downloading, setDownloading] = useState(false);

  async function download(photo: GalleryPhoto) {
    setDownloading(true);
    try {
      const res = await fetch(photo.cloudinary_url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${photo.id}.jpg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  if (photos.length === 0) {
    return (
      <p className="text-center font-sans text-base text-ink/55">
        Todavía no hay fotos aprobadas.
      </p>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4">
        {photos.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setActive(p)}
            className="overflow-hidden rounded-sm border border-ink/10 bg-ivory"
          >
            <Image
              src={p.thumbnail_url}
              alt="Foto de la boda"
              width={480}
              height={480}
              className="aspect-square w-full object-cover"
              loading="lazy"
            />
          </button>
        ))}
      </div>

      {active && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-ink/95 p-4"
          onClick={() => setActive(null)}
        >
          <div
            className="relative max-h-[75dvh] w-full max-w-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={active.cloudinary_url}
              alt="Foto de la boda en grande"
              width={1920}
              height={1440}
              className="max-h-[75dvh] w-full rounded-sm object-contain"
              priority
            />
          </div>
          <div
            className="flex gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              disabled={downloading}
              onClick={() => download(active)}
              className="rounded-sm bg-bronze px-6 py-2.5 text-base text-ivory transition-colors hover:bg-bronze/90 disabled:opacity-60"
            >
              {downloading ? "Descargando…" : "Descargar"}
            </button>
            <button
              type="button"
              onClick={() => setActive(null)}
              className="rounded-sm border border-ivory/30 px-6 py-2.5 text-base text-ivory"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
