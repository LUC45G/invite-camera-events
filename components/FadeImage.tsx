"use client";

import Image from "next/image";
import { useState } from "react";

type Props = {
  src: string;
  alt: string;
  sizes: string;
};

// Imagen con fade-in lento al terminar de cargar.
export function FadeImage({ src, alt, sizes }: Props) {
  const [loaded, setLoaded] = useState(false);

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      onLoad={() => setLoaded(true)}
      className={`object-cover transition-opacity duration-1000 ease-out ${
        loaded ? "opacity-100" : "opacity-0"
      }`}
    />
  );
}
