"use client";

import Image from "next/image";
import { useRef } from "react";

type Props = {
  images: string[];
};

// Carrusel horizontal: en el viewport se ven 2 fotos enteras y 2 mitades
// (una a cada lado) para sugerir que hay más para deslizar.
export function PhotoCarousel({ images }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);

  function scrollByCards(dir: 1 | -1) {
    const track = trackRef.current;
    if (!track) return;
    const card = track.firstElementChild as HTMLElement | null;
    const step = card ? card.offsetWidth + 16 : track.offsetWidth;
    track.scrollBy({ left: dir * step, behavior: "smooth" });
  }

  return (
    <div className="relative">
      <div
        ref={trackRef}
        className="carousel flex gap-4 overflow-x-auto px-6"
      >
        {images.map((src, i) => (
          <div
            key={src}
            className="carousel-item relative aspect-[3/4] h-72 shrink-0 overflow-hidden rounded-sm border border-ink/15"
          >
            <Image
              src={src}
              alt={`Recuerdo ${i + 1}`}
              fill
              sizes="(max-width: 640px) 40vw, 18rem"
              className="object-cover"
            />
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => scrollByCards(-1)}
          aria-label="Anterior"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-ink/20 bg-ivory text-ink transition-colors hover:border-bronze hover:text-bronze"
        >
          ←
        </button>
        <button
          type="button"
          onClick={() => scrollByCards(1)}
          aria-label="Siguiente"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-ink/20 bg-ivory text-ink transition-colors hover:border-bronze hover:text-bronze"
        >
          →
        </button>
      </div>
    </div>
  );
}
