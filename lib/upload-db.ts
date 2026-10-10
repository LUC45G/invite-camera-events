import { sql, type Event, type TableQr, type UploadSession } from "@/lib/db";
import { randomBytes } from "node:crypto";

// Utilidades de DB para el flujo de subida (fase 1).
// Todas las queries van contra Neon vía el driver serverless.

export async function getEventBySlug(slug: string): Promise<Event | null> {
  const rows = await sql`SELECT * FROM events WHERE slug = ${slug} LIMIT 1`;
  return (rows[0] as Event) ?? null;
}

export async function getEventById(id: string): Promise<Event | null> {
  const rows = await sql`SELECT * FROM events WHERE id = ${id} LIMIT 1`;
  return (rows[0] as Event) ?? null;
}

export async function findTableQr(qrToken: string): Promise<TableQr | null> {
  const rows =
    await sql`SELECT * FROM table_qrs WHERE qr_token = ${qrToken} LIMIT 1`;
  return (rows[0] as TableQr) ?? null;
}

export async function findSession(
  sessionToken: string,
): Promise<UploadSession | null> {
  const rows =
    await sql`SELECT * FROM upload_sessions WHERE session_token = ${sessionToken} LIMIT 1`;
  return (rows[0] as UploadSession) ?? null;
}

export async function createSession(
  eventId: string,
  tableQrId: string | null,
  accessMode: Event["access_mode"] = "invitations",
): Promise<UploadSession> {
  const sessionToken = randomBytes(32).toString("hex");
  const rows = await sql`
    INSERT INTO upload_sessions (event_id, table_qr_id, session_token, access_mode)
    VALUES (${eventId}, ${tableQrId}, ${sessionToken}, ${accessMode})
    RETURNING *`;
  return rows[0] as UploadSession;
}

export async function findPublicQr(qrToken: string): Promise<Event | null> {
  const rows = await sql`SELECT * FROM events WHERE public_qr_token = ${qrToken} AND access_mode = 'public_qr' LIMIT 1`;
  return (rows[0] as Event) ?? null;
}

// Both signing and completion must validate the session's event and mode.
export async function uploadAllowance(event: Event, session: UploadSession) {
  if (session.event_id !== event.id || (session.access_mode ?? "invitations") !== event.access_mode) return null;
  if (event.access_mode === "public_qr") {
    if (session.table_qr_id !== null) return null;
    return { uploaded: Number(session.photo_count), limit: event.max_photos_per_session };
  }
  if (!session.table_qr_id) return null;
  const rows = await sql`SELECT max_photos FROM table_qrs WHERE id = ${session.table_qr_id} AND event_id = ${event.id} LIMIT 1`;
  if (!rows[0]) return null;
  return { uploaded: await countPhotosForTable(session.table_qr_id), limit: Number(rows[0].max_photos) };
}

export async function touchSession(sessionId: string): Promise<void> {
  await sql`UPDATE upload_sessions SET last_seen_at = now() WHERE id = ${sessionId}`;
}

// Invitado (mesa/familia) asociado a un QR, para validar su RSVP.
export async function findGuestByTable(
  tableQrId: string,
): Promise<{ rsvp_status: string } | null> {
  const rows = await sql`
    SELECT rsvp_status FROM guests WHERE table_qr_id = ${tableQrId} LIMIT 1`;
  return (rows[0] as { rsvp_status: string }) ?? null;
}

// Número y nombre visible de una mesa (para mostrar a qué mesa está ligado el dispositivo).
export async function getTableDisplay(
  tableQrId: string,
): Promise<{ table_number: number; guest_name: string | null } | null> {
  const rows = await sql`
    SELECT t.table_number, g.name AS guest_name
    FROM table_qrs t
    LEFT JOIN guests g ON g.table_qr_id = t.id
    WHERE t.id = ${tableQrId}
    LIMIT 1`;
  return (rows[0] as {
    table_number: number;
    guest_name: string | null;
  }) ?? null;
}

// Fotos subidas para una mesa (límite 24 por mesa/familia).
export async function countPhotosForTable(tableQrId: string): Promise<number> {
  const rows =
    await sql`SELECT count(*) AS n FROM photos WHERE table_qr_id = ${tableQrId}`;
  return Number(rows[0].n);
}
