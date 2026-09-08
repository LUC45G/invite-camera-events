// Fuente centralizada de datos del evento para la invitación.
// Placeholders genéricos: editar acá con los datos reales de la boda.
// ponytail: config estática en archivo; un panel de edición es nice-to-have futuro.

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
  faq: { heading: string; paragraphs: string[]; image: string };
  gallery: string[];
  schedule: { time: string; label: string; detail: string }[];
};

export const weddingEvent: WeddingEvent = {
  slug: "nuestra-boda",
  coupleNames: "Sofía & Mateo",
  date: "Sábado 12 de septiembre de 2026",
  time: "18:00",
  // Fecha random placeholder: ajustar con la fecha real de la boda.
  weddingTimestamp: "2026-12-12T18:00:00-03:00",
  venue: "Salón Jardín del Valle",
  venueAddress: "Av. de los Cerezos 1234, Ciudad",
  mapsUrl: "https://maps.google.com/?q=Av.+de+los+Cerezos+1234",
  dressCode: "Elegante",
  contactName: "Sofía y Mateo",
  contactPhone: "+54 9 11 0000 0000",
  heroImage: "https://images.unsplash.com/photo-1519741497674-611481863552",
  story: {
    heading: "Nuestra historia",
    paragraphs: [
      "Nos conocimos un verano, entre amigos y música, y desde esa noche no paramos de sumar momentos. Texto placeholder: contá acá cómo se conocieron.",
      "Hoy queremos celebrar con quienes más queremos. Este sitio es nuestra invitación y, el día de la fiesta, la cámara de todos.",
    ],
    image: "https://images.unsplash.com/photo-1583939003579-730e3918a45a",
  },
  faq: {
    heading: "Preguntas frecuentes",
    paragraphs: [
      "¿Tienen parking? Sí, hay estacionamiento gratuito en el venue.",
      "¿Puedo llevar acompañante? ¡Claro! Indicalo en tu confirmación.",
      "¿A qué hora termina? La fiesta finaliza a la 1:00 AM.",
    ],
    image: "https://images.unsplash.com/photo-1520854221256-17451cc331bf",
  },
  gallery: [
    "https://images.unsplash.com/photo-1583939003579-730e3918a45a",
    "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6",
    "https://images.unsplash.com/photo-1520854221256-17451cc331bf",
    "https://images.unsplash.com/photo-1511285560929-80b456fea0bc",
    "https://images.unsplash.com/photo-1537633552985-df8429e8048b",
    "https://images.unsplash.com/photo-1519225421980-715cb0215aed",
    "https://images.unsplash.com/photo-1606216794074-735e91aa2c92",
  ],
  schedule: [
    { time: "18:00", label: "Ceremonia", detail: "Juramento y anillos" },
    { time: "19:00", label: "Cóctel", detail: "Brindis de bienvenida" },
    { time: "20:00", label: "Cena", detail: "Menú especial" },
    { time: "22:00", label: "Fiesta", detail: "Baile y música en vivo" },
  ],
};

export function getEvent(slug: string): WeddingEvent | null {
  if (slug !== weddingEvent.slug) return null;
  return weddingEvent;
}
