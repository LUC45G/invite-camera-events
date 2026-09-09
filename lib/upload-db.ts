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
  tableQrId: string,
): Promise<UploadSession> {
  const sessionToken = randomBytes(32).toString("hex");
  const rows = await sql`
    INSERT INTO upload_sessions (event_id, table_qr_id, session_token)
    VALUES (${eventId}, ${tableQrId}, ${sessionToken})
    RETURNING *`;
  return rows[0] as UploadSession;
}

export async function touchSession(sessionId: string): Promise<void> {
  await sql`UPDATE upload_sessions SET last_seen_at = now() WHERE id = ${sessionId}`;
}

// Fotos subidas para una mesa (límite 24 por mesa/familia).
export async function countPhotosForTable(tableQrId: string): Promise<number> {
  const rows =
    await sql`SELECT count(*) AS n FROM photos WHERE table_qr_id = ${tableQrId}`;
  return Number(rows[0].n);
}
