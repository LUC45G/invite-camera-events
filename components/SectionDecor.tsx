import Image from "next/image";
import type { Decoration } from "@/lib/event-data";

const CORNER_CLASS: Record<Decoration["corner"], string> = {
  "top-left": "top-0 left-0",
  "top-right": "top-0 right-0",
  "bottom-left": "bottom-0 left-0",
  "bottom-right": "bottom-0 right-0",
};

const SIDE_CLASS: Record<Decoration["corner"], string> = {
  "top-left": "left-0",
  "bottom-left": "left-0",
  "top-right": "right-0",
  "bottom-right": "right-0",
};

// Decoración floral anclada al ancestro posicionado más cercano.
// No intercepta clicks ni se puede seleccionar.
export function SectionDecor({ items }: { items: Decoration[] }) {
  if (!items?.length) return null;

  return (
    <>
      {items.map((item, i) => {
        const key = `${item.src}-${item.corner}-${i}`;

        // "side": alto completo pegado al costado. El canvas es transparente,
        // así que el sobrante que se pasa del otro lado lo recorta el overflow.
        if (item.fit === "side") {
          return (
            <span
              key={key}
              aria-hidden="true"
              className={`pointer-events-none absolute inset-y-0 select-none ${SIDE_CLASS[item.corner]}`}
            >
              <Image
                src={item.src}
                alt=""
                width={item.width}
                height={item.height}
                sizes="(max-width: 768px) 100vw, 60vw"
                className="h-full w-auto max-w-none"
              />
            </span>
          );
        }

        // "corner": ancho fijo, el arte abraza la esquina en L.
        const wide = item.width / item.height > 1.6;
        const size = wide
          ? "w-[95%] max-w-[680px] sm:w-[68%]"
          : "w-[75%] max-w-[560px] sm:w-[52%]";
        const sizes = wide
          ? "(max-width: 768px) 95vw, 680px"
          : "(max-width: 768px) 75vw, 560px";

        return (
          <span
            key={key}
            aria-hidden="true"
            className={`pointer-events-none absolute select-none ${CORNER_CLASS[item.corner]} ${size}`}
          >
            <Image
              src={item.src}
              alt=""
              width={item.width}
              height={item.height}
              sizes={sizes}
              className="h-auto w-full"
            />
          </span>
        );
      })}
    </>
  );
}
