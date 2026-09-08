import Image from "next/image";
import { ReactNode } from "react";

type Props = {
  image: string;
  alt: string;
  reverse?: boolean;
  children: ReactNode;
};

export function SplitSection({ image, alt, reverse, children }: Props) {
  return (
    <section className={`flex min-h-dvh snap-start flex-col max-md:min-h-dvh md:grid md:grid-rows-[1fr] ${
      reverse ? "md:grid-cols-[35fr_65fr]" : "md:grid-cols-[65fr_35fr]"
    }`}>
      {/* Texto */}
      <div
        className={`flex flex-1 flex-col items-center justify-center overflow-y-auto px-8 py-16 max-md:order-2 max-md:px-6 max-md:py-12 ${
          reverse ? "md:col-start-1" : "md:col-start-2"
        }`}
      >
        {children}
      </div>
      {/* Foto */}
      <div
        className={`relative overflow-hidden max-md:order-1 max-md:h-[50dvh] md:h-full ${
          reverse ? "md:col-start-2" : "md:col-start-1"
        }`}
      >
        <Image
          src={image}
          alt={alt}
          fill
          sizes={reverse ? "(max-width: 768px) 100vw, 35vw" : "(max-width: 768px) 100vw, 65vw"}
          className="object-cover"
        />
      </div>
    </section>
  );
}
