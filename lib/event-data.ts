// Fuente centralizada de datos del evento para la invitación.
// Placeholders genéricos: editar acá con los datos reales de la boda.
// ponytail: config estática en archivo; un panel de edición es nice-to-have futuro.

import { env } from "@/lib/env";

export type ScheduleItem = {
  time: string; // "16:00"
  title: string;
  description: string;
  icon: string;
};

// Decoración floral de esquinas. Los PNG viven en /public/decor.
export type DecorCorner =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

export type Decoration = {
  src: string;
  corner: DecorCorner;
  width: number; // ancho intrínseco del PNG
  height: number; // alto intrínseco del PNG
  // "corner" (default): ancho fijo, el arte abraza la esquina en L.
  // "side": alto completo, el arte se pega al costado (el canvas es
  // transparente, así que el sobrante se recorta sin verse).
  fit?: "corner" | "side";
  mobile?: {
    corner: DecorCorner;
    width?: "small" | "default";
  } | "hidden";
  hidden?: boolean;
};

export type WeddingEvent = {
  slug: string;
  coupleNames: string;
  date: string; // "Sábado 12 de septiembre de 2026"
  time: string; // "18:00"
  weddingTimestamp: string; // ISO 8601 — para el countdown
  venue: string;
  venueAddress: string;
  mapsUrl: string;
  dressCode: string;
  contactName: string;
  contactPhone: string;
  heroImage: string;
  story: { heading: string; paragraphs: string[]; image: string };
  schedule: ScheduleItem[];
  faq: { question: string; answer: string }[];
  decor: {
    history: Decoration[];
    schedule: Decoration[];
    faq: Decoration[];
    ceremony: Decoration[];
  };
};

export const weddingEvent: WeddingEvent = {
  slug: env.EVENT_SLUG,
  coupleNames: "Daniela & Miguel",
  date: "Domingo 07 de febrero de 2027",
  time: "19:00",
  // Fecha random placeholder: ajustar con la fecha real de la boda.
  weddingTimestamp: "2027-02-07T16:00:00-03:00",
  venue: "Predio Quimicos Y Petroquímicos",
  venueAddress: "General Daniel Cerri",
  mapsUrl: "https://maps.app.goo.gl/LePwQageupcx3y3H7",
  dressCode: "Elegante",
  contactName: "Daniela y Miguel",
  contactPhone: "+54 9 291 4312636",
  heroImage: "https://images.unsplash.com/photo-1519741497674-611481863552",
  story: {
    heading: "Te invitamos a ser parte",
    paragraphs: [
      "Por todos los momentos felices que hemos vivido, y por todo lo que está por llegar,",
      "¡NOS CASAMOS!",
      "Y nos encantaría compartir este día con las personas más especiales para nosotros."
    ],
    image: "https://images.unsplash.com/photo-1583939003579-730e3918a45a",
  },
  schedule: [
    { time: "19:30", title: "Ceremonia", description: "Sin derecho a devolución.", icon: "/icons/ceremonia.webp" },
    { time: "20:00", title: "Baile de Entrada", description: "Aplaudan aunque bailemos mal.", icon: "/icons/baile-de-entrada.webp" },
    { time: "20:30", title: "Recepción", description: "A la caza de canapés.", icon: "/icons/recepcion.png" },
    { time: "20:30", title: "Fotos Familiares", description: "Sonrían, después las borramos.", icon: "/icons/fotos.png" },
    { time: "21:30", title: "Vals", description: "Mood romántico activado.", icon: "/icons/vals.webp" },
    { time: "22:00", title: "Cena", description: "Pintó la gula.", icon: "/icons/cena.png" },
    { time: "23:00", title: "Baile", description: "Entran los prohibidos.", icon: "/icons/baile.png" },
    { time: "00:30", title: "Mesa Dulce y Barra Libre", description: "Azúcar, alcohol y descontrol.", icon: "/icons/mesa-dulce.png" },
    { time: "03:00", title: "Cotillón y Toro Mecánico", description: "A domar o morir.", icon: "/icons/cotillon.png" },
    { time: "04:00", title: "Medianoche", description: "El bajón salvador.", icon: "/icons/medianoche.webp" },
  ],
  get faq() {
    return [
      { question: "Código de vestimenta", answer: "Elegante casual." },
      { question: "Horario", answer: `La ceremonia empieza a las 19:00hs. La fiesta es hasta las 5:00hs` },
      { question: "Estacionamiento", answer: "El salón tiene estacionamiento propio, se ingresa por la entrada derecha y el salón está al doblar en la primera intersección hacia la izquierda." }
    ];
  },
  decor: {
    // "Te invitamos a ser parte"
    history: [
      {
        src: "/decor/rose-bottom-right.png",
        corner: "bottom-right",
        width: 2500,
        height: 2500,
        mobile: "hidden",
        hidden: true,
      },
    ],
    // Cronograma — un asset por costado, pegados al borde y a alto completo
    schedule: [
      {
        src: "/decor/cherry-top-right.png",
        corner: "top-right",
        width: 1920,
        height: 1080,
        fit: "side",
        mobile: { corner: "top-right", width: "default" },
      },
    ],
    // Preguntas — la segunda rama cherry usa exactamente el mismo tamaño responsive.
    faq: [
      {
        src: "/decor/cherry-bottom-left.png",
        corner: "bottom-left",
        width: 1920,
        height: 1080,
        fit: "side",
        mobile: { corner: "bottom-left", width: "default" },
      },
    ],
    // Ceremonia y festejo
    ceremony: [
      {
        src: "/decor/rose-top-left.png",
        corner: "top-left",
        width: 2500,
        height: 2500,
        mobile: "hidden",
        hidden: true,
      },
    ],
  },
};

export function getEvent(slug: string): WeddingEvent | null {
  if (slug !== weddingEvent.slug) return null;
  return weddingEvent;
}
