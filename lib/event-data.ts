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
};

export function getEvent(slug: string): WeddingEvent | null {
  if (slug !== weddingEvent.slug) return null;
  return weddingEvent;
}
