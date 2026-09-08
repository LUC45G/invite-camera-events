// Store mock en memoria para RSVP. Sin DB todavía.
// ponytail: mock in-memory, reemplazar por operaciones reales en fotos/DB cuando se conecte Neon.
// Nota: en serverless esto no persiste entre requests; es solo para testear la UI de la fase 2.

type Rsvp = {
  token: string;
  name: string;
  status: "accepted" | "declined";
  guests: number;
  dietary: string | null;
  respondedAt: string;
};

const rsvps = new Map<string, Rsvp>();

export function findRsvp(token: string): Rsvp | undefined {
  return rsvps.get(token);
}

export function saveRsvp(rsvp: Rsvp): void {
  rsvps.set(rsvp.token, rsvp);
}

// Token conocido para poder probar sin DB: cualquier token con este formato es "válido".
// En producción se valida contra guests.token en la DB.
export function isTokenValid(token: string): boolean {
  return token.length > 0;
}
