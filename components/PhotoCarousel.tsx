"use client";

import Image from "next/image";
import { useCallback, useRef, useState } from "react";

type Props = {
  images: string[];
};

// Carrusel horizontal con loop infinito por índice (módulo sobre el array).
export function PhotoCarousel({ images }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const count = images.length;

  const getStep = useCallback(() => {
    const card = trackRef.current?.firstElementChild as HTMLElement | null;
    return card ? card.offsetWidth + 16 : 0;
  }, []);

  const goTo = useCallback(
    (index: number) => {
      const track = trackRef.current;
      if (!track) return;
      const step = getStep();
      track.scrollTo({ left: index * step, behavior: "smooth" });
      setActiveIndex(index);
    },
    [getStep],
  );

  const prev = () => goTo((activeIndex - 1 + count) % count);
  const next = () => goTo((activeIndex + 1) % count);

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
          onClick={prev}
          aria-label="Anterior"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-ink/20 bg-ivory text-ink transition-colors hover:border-bronze hover:text-bronze"
        >
          ←
        </button>
        <button
          type="button"
          onClick={next}
          aria-label="Siguiente"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-ink/20 bg-ivory text-ink transition-colors hover:border-bronze hover:text-bronze"
        >
          →
        </button>
      </div>
    </div>
  );
}
