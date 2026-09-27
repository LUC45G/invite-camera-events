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

const MOBILE_SIDE_CLASS: Record<Decoration["corner"], string> = {
  "top-left": "top-0 left-0",
  "top-right": "top-0 right-0",
  "bottom-left": "bottom-0 left-0",
  "bottom-right": "bottom-0 right-0",
};

const DESKTOP_SIDE_RESPONSIVE_CLASS: Record<Decoration["corner"], string> = {
  "top-left": "md:left-0",
  "top-right": "md:right-0",
  "bottom-left": "md:left-0",
  "bottom-right": "md:right-0",
};

// Decoración floral anclada al ancestro posicionado más cercano.
// No intercepta clicks ni se puede seleccionar.
export function SectionDecor({ items }: { items: Decoration[] }) {
  const visibleItems = items?.filter((item) => !item.hidden) ?? [];
  if (!visibleItems.length) return null;

  return (
    <>
      {visibleItems.map((item, i) => {
        const key = `${item.src}-${item.corner}-${i}`;

        // "side": alto completo pegado al costado. El canvas es transparente,
        // así que el sobrante que se pasa del otro lado lo recorta el overflow.
        if (item.fit === "side") {
          const mobileHidden = item.mobile === "hidden";
          const mobileCorner = typeof item.mobile === "object" ? item.mobile.corner : null;
          const mobileWidth =
            typeof item.mobile === "object" && item.mobile.width === "small"
              ? "w-[88%]"
              : "w-[143%]";

          return (
            <span
              key={key}
              aria-hidden="true"
              className={
                mobileHidden
                  ? `pointer-events-none absolute inset-y-0 hidden select-none md:block ${SIDE_CLASS[item.corner]}`
                  : mobileCorner
                    ? `pointer-events-none absolute aspect-[16/9] select-none ${MOBILE_SIDE_CLASS[mobileCorner]} ${mobileWidth} md:inset-y-0 md:w-auto md:aspect-[16/9] ${DESKTOP_SIDE_RESPONSIVE_CLASS[item.corner]}`
                    : `pointer-events-none absolute inset-y-0 aspect-[16/9] select-none ${SIDE_CLASS[item.corner]}`
              }
            >
              <Image
                src={item.src}
                alt=""
                sizes="(max-width: 768px) 100vw, 60vw"
                fill
                unoptimized
                className="object-contain"
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
            className={`${item.mobile === "hidden" ? "hidden md:block" : ""} pointer-events-none absolute select-none ${CORNER_CLASS[item.corner]} ${size}`}
          >
            <Image
              src={item.src}
              alt=""
              width={item.width}
              height={item.height}
              unoptimized
              sizes={sizes}
              className="h-auto w-full"
            />
          </span>
        );
      })}
    </>
  );
}
