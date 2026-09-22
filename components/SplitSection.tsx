import { FadeImage } from "@/components/FadeImage";
import { SectionDecor } from "@/components/SectionDecor";
import type { Decoration } from "@/lib/event-data";
import { ReactNode } from "react";

type Props = {
  image: string;
  alt: string;
  reverse?: boolean;
  decor?: Decoration[];
  children: ReactNode;
};

export function SplitSection({ image, alt, reverse, decor = [], children }: Props) {
  return (
    <section
      className={`relative flex min-h-dvh snap-start flex-col overflow-hidden md:grid md:min-h-dvh md:grid-rows-[1fr] ${
        reverse ? "md:grid-cols-[35fr_65fr]" : "md:grid-cols-[65fr_35fr]"
      }`}
    >
      {/* Mobile: la decoración se ancla a la sección completa */}
      {decor.length > 0 && (
        <div className="z-0 md:hidden">
          <SectionDecor items={decor} />
        </div>
      )}

      {/* Texto — hijo directo del grid en desktop */}
      <div
        className={`relative z-20 flex flex-col items-center justify-center px-8 py-12 max-md:order-2 max-md:h-[50dvh] max-md:px-6 ${
          reverse ? "md:order-1" : "md:order-2"
        }`}
      >
        {/* Desktop: la decoración se ancla solo a la columna de texto */}
        {decor.length > 0 && (
          <div className="hidden md:block">
            <SectionDecor items={decor} />
          </div>
        )}
        {children}
      </div>
      {/* Foto — hijo directo del grid en desktop */}
      <div
        className={`relative z-10 overflow-hidden max-md:order-1 max-md:h-[50dvh] ${
          reverse ? "md:order-2" : "md:order-1"
        }`}
      >
        <FadeImage
          src={image}
          alt={alt}
          sizes="(max-width: 768px) 100vw, 50vw"
        />
      </div>
    </section>
  );
}
