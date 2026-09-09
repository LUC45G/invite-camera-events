import { sql } from "@/lib/db";

// RSVP real contra la tabla guests (mesa/familia, no individuo).
export type GuestRsvp = {
  name: string | null;
  status: "accepted" | "declined";
  guests: number;
  dietary: string | null;
};

export async function isTokenValid(token: string): Promise<boolean> {
  if (!token) return false;
  const rows =
    await sql`SELECT id FROM guests WHERE token = ${token} LIMIT 1`;
  return rows.length > 0;
}

export async function findRsvp(token: string): Promise<GuestRsvp | undefined> {
  const rows =
    await sql`SELECT name, rsvp_status, rsvp_guests, rsvp_dietary FROM guests WHERE token = ${token} LIMIT 1`;
  const g = rows[0] as
    | { name: string | null; rsvp_status: string; rsvp_guests: number; rsvp_dietary: string | null }
    | undefined;
  if (!g || g.rsvp_status === "pending") return undefined;
  return {
    name: g.name,
    status: g.rsvp_status as "accepted" | "declined",
    guests: g.rsvp_guests,
    dietary: g.rsvp_dietary,
  };
}

export async function saveRsvp(data: {
  token: string;
  name: string;
  status: "accepted" | "declined";
  guests: number;
  dietary: string | null;
}): Promise<boolean> {
  const rows = await sql`
    UPDATE guests
    SET name = ${data.name},
        rsvp_status = ${data.status},
        rsvp_guests = ${data.guests},
        rsvp_dietary = ${data.dietary},
        rsvp_responded_at = now()
    WHERE token = ${data.token}
      AND rsvp_status = 'pending'
    RETURNING id`;
  return rows.length > 0;
}
