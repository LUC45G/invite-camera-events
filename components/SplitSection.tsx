import { FadeImage } from "@/components/FadeImage";
import { ReactNode } from "react";

type Props = {
  image: string;
  alt: string;
  reverse?: boolean;
  children: ReactNode;
};

export function SplitSection({ image, alt, reverse, children }: Props) {
  return (
    <section
      className={`flex min-h-dvh snap-start flex-col md:grid md:min-h-dvh md:grid-rows-[1fr] ${
        reverse ? "md:grid-cols-[35fr_65fr]" : "md:grid-cols-[65fr_35fr]"
      }`}
    >
      {/* Texto — hijo directo del grid en desktop */}
      <div
        className={`flex flex-col items-center justify-center px-8 py-12 max-md:order-2 max-md:h-[50dvh] max-md:px-6 ${
          reverse ? "md:order-1" : "md:order-2"
        }`}
      >
        {children}
      </div>
      {/* Foto — hijo directo del grid en desktop */}
      <div
        className={`relative overflow-hidden max-md:order-1 max-md:h-[50dvh] ${
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
