"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type Props = {
  src: string;
  alt: string;
  sizes: string;
};

// Fade-in lento cuando la foto entra al viewport Y terminó de cargar.
// (onLoad solo no alcanza: el browser precarga aunque esté fuera de pantalla.)
export function FadeImage({ src, alt, sizes }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const visible = inView && loaded;

  return (
    <div ref={ref} className="h-full w-full">
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        className={`object-cover transition-opacity duration-1000 ease-out ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}
