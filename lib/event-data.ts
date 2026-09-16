// Fuente centralizada de datos del evento para la invitación.
// Placeholders genéricos: editar acá con los datos reales de la boda.
// ponytail: config estática en archivo; un panel de edición es nice-to-have futuro.

export type ScheduleItem = {
  time: string; // "16:00"
  title: string;
  description: string;
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
};

export const weddingEvent: WeddingEvent = {
  slug: "nuestra-boda",
  coupleNames: "Daniela & Miguel",
  date: "Domingo 07 de febrero de 2027",
  time: "16:00",
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
      "La verdad es que es maravilloso la forma en que no sé qué carajo poner acá.",
      "Hoy queremos celebrar con quienes más queremos. Nos encantaría tenerte con nosotros allá.",
    ],
    image: "https://images.unsplash.com/photo-1583939003579-730e3918a45a",
  },
  schedule: [
    { time: "16:00", title: "Ceremonia", description: "Nos damos el sí en el predio." },
    { time: "17:00", title: "Fotos y brindis", description: "Fotos grupales y primer brindis al aire libre." },
    { time: "18:30", title: "Cena", description: "Cena servida para todas las mesas." },
    { time: "20:30", title: "Fiesta", description: "Pista abierta hasta que el cuerpo aguante." },
    { time: "23:30", title: "Cierre", description: "Último tema y despedida." },
  ],
};

export function getEvent(slug: string): WeddingEvent | null {
  if (slug !== weddingEvent.slug) return null;
  return weddingEvent;
}
