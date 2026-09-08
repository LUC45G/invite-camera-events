// Fuente centralizada de datos del evento para la invitación.
// Placeholders genéricos: editar acá con los datos reales de la boda.
// ponytail: config estática en archivo; un panel de edición es nice-to-have futuro.

export type WeddingEvent = {
  slug: string;
  coupleNames: string;
  date: string; // "Sábado 12 de septiembre de 2026"
  time: string; // "18:00"
  venue: string;
  venueAddress: string;
  mapsUrl: string;
  dressCode: string;
  contactName: string;
  contactPhone: string;
  heroImage: string; // URL de foto placeholder (Unsplash)
  gallery: string[]; // URLs de fotos placeholder para la galería en recuadros
};

export const weddingEvent: WeddingEvent = {
  slug: "nuestra-boda",
  coupleNames: "Sofía & Mateo",
  date: "Sábado 12 de septiembre de 2026",
  time: "18:00",
  venue: "Salón Jardín del Valle",
  venueAddress: "Av. de los Cerezos 1234, Ciudad",
  mapsUrl: "https://maps.google.com/?q=Av.+de+los+Cerezos+1234",
  dressCode: "Elegante",
  contactName: "Sofía y Mateo",
  contactPhone: "+54 9 11 0000 0000",
  // Placeholders: reemplazar por fotos reales de la pareja.
  heroImage: "https://images.unsplash.com/photo-1519741497674-611481863552",
  gallery: [
    "https://images.unsplash.com/photo-1583939003579-730e3918a45a",
    "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6",
    "https://images.unsplash.com/photo-1520854221256-17451cc331bf",
  ],
};

export function getEvent(slug: string): WeddingEvent | null {
  if (slug !== weddingEvent.slug) return null;
  return weddingEvent;
}
