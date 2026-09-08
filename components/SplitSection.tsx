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
    <section
      className={`grid min-h-dvh snap-start grid-rows-[1fr] ${
        reverse ? "grid-cols-[35fr_65fr]" : "grid-cols-[65fr_35fr]"
      } max-md:grid-cols-1`}
    >
      <div
        className={`flex flex-col items-center justify-center overflow-y-auto px-8 py-16 max-md:px-6 max-md:py-12 ${
          reverse ? "max-md:order-2 md:col-start-1" : "max-md:order-2 md:col-start-2"
        }`}
      >
        {children}
      </div>
      <div
        className={`relative h-full overflow-hidden ${
          reverse ? "max-md:order-1 md:col-start-2" : "max-md:order-1 md:col-start-1"
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
