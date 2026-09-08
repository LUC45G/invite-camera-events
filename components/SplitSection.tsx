import Image from "next/image";
import { ReactNode } from "react";

type Props = {
  image: string;
  alt: string;
  reverse?: boolean;
  children: ReactNode;
};

// Sección full-screen con foto (65%) y contenido (35%).
// reverse=true: texto a la izquierda, foto a la derecha.
// Mobile: siempre foto arriba, contenido abajo.
export function SplitSection({ image, alt, reverse, children }: Props) {
  return (
    <section
      className={`grid min-h-dvh snap-start ${
        reverse ? "grid-cols-[35fr_65fr]" : "grid-cols-[65fr_35fr]"
      } max-md:grid-cols-1 max-md:min-h-dvh`}
    >
      {/* Texto — primero en DOM para que order funcione bien en desktop */}
      <div
        className={`flex flex-col items-center justify-center px-8 py-16 max-md:px-6 max-md:py-12 ${
          reverse ? "md:order-1" : "md:order-2"
        } max-md:order-2`}
      >
        {children}
      </div>
      {/* Foto */}
      <div
        className={`relative min-h-[50dvh] overflow-hidden ${
          reverse ? "max-md:order-1" : "max-md:order-1"
        }`}
      >
        <Image
          src={image}
          alt={alt}
          fill
          sizes="(max-width: 768px) 100vw, 65vw"
          className="object-cover"
        />
      </div>
    </section>
  );
}
