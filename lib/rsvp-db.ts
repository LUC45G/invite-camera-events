import { sql } from "@/lib/db";
import { env } from "@/lib/env";

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
    await sql`SELECT g.id FROM guests g JOIN events e ON e.id = g.event_id WHERE g.token = ${token} AND e.access_mode = 'invitations' AND e.setup_complete AND NOT e.deletion_pending AND EXISTS (SELECT 1 FROM table_qrs t WHERE t.id = g.table_qr_id AND NOT t.upload_paused) AND e.slug = ${env.EVENT_SLUG} AND e.deployment_id = ${env.DEPLOYMENT_ID} AND e.hostname = ${env.EVENT_HOSTNAME} LIMIT 1`;
  return rows.length > 0;
}

export async function findRsvp(token: string): Promise<GuestRsvp | undefined> {
  const rows =
    await sql`SELECT g.name, g.rsvp_status, g.rsvp_guests, g.rsvp_dietary FROM guests g JOIN events e ON e.id = g.event_id WHERE g.token = ${token} AND e.access_mode = 'invitations' AND e.setup_complete AND NOT e.deletion_pending AND EXISTS (SELECT 1 FROM table_qrs t WHERE t.id = g.table_qr_id AND NOT t.upload_paused) AND e.slug = ${env.EVENT_SLUG} AND e.deployment_id = ${env.DEPLOYMENT_ID} AND e.hostname = ${env.EVENT_HOSTNAME} LIMIT 1`;
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
      AND table_qr_id IN (SELECT id FROM table_qrs WHERE NOT upload_paused)
      AND event_id IN (SELECT id FROM events WHERE setup_complete AND NOT deletion_pending AND access_mode = 'invitations' AND slug = ${env.EVENT_SLUG} AND deployment_id = ${env.DEPLOYMENT_ID} AND hostname = ${env.EVENT_HOSTNAME})
    RETURNING id`;
  return rows.length > 0;
}
