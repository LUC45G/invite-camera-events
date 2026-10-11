import { sql, type Event, type TableQr, type UploadAuthorization, type UploadSession } from "@/lib/db";
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
    await releaseExpiredAuthorizations();
    const rows = await sql`SELECT count(*) AS n FROM upload_authorizations WHERE upload_session_id = ${session.id} AND status = 'reserved'`;
    return { uploaded: Number(session.photo_count) + Number(rows[0]?.n ?? 0), limit: event.max_photos_per_session };
  }
  if (!session.table_qr_id) return null;
  const rows = await sql`SELECT max_photos FROM table_qrs WHERE id = ${session.table_qr_id} AND event_id = ${event.id} LIMIT 1`;
  if (!rows[0]) return null;
  await releaseExpiredAuthorizations();
  const consumed = await sql`
    SELECT
      (SELECT count(*) FROM photos WHERE table_qr_id = ${session.table_qr_id} AND authorization_id IS NULL) +
      (SELECT count(*) FROM upload_authorizations WHERE table_qr_id = ${session.table_qr_id} AND status = 'consumed') AS n`;
  const reserved = await sql`SELECT count(*) AS n FROM upload_authorizations WHERE table_qr_id = ${session.table_qr_id} AND status = 'reserved'`;
  return { uploaded: Number(consumed[0]?.n ?? 0) + Number(reserved[0]?.n ?? 0), limit: Number(rows[0].max_photos) };
}

export async function releaseExpiredAuthorizations(): Promise<void> {
  await sql`UPDATE upload_authorizations SET status = 'released' WHERE status = 'reserved' AND expires_at <= now()`;
}

export async function reserveUploadAuthorization(event: Event, session: UploadSession, publicId: string, signedAt: number, token: string): Promise<{ authorization: UploadAuthorization; uploaded: number; limit: number } | null> {
  await releaseExpiredAuthorizations();
  const scope = session.table_qr_id ?? session.id;
  const limit = event.access_mode === "public_qr" ? event.max_photos_per_session : null;
  const rows = await sql`
    WITH lock AS (SELECT pg_advisory_xact_lock(hashtext(${scope}))),
    eligible AS (
      SELECT s.id, s.event_id, s.table_qr_id,
        ${limit ?? 0}::int AS configured_limit,
        CASE WHEN s.table_qr_id IS NULL THEN s.photo_count ELSE
          (SELECT count(*) FROM photos WHERE table_qr_id = s.table_qr_id AND authorization_id IS NULL) +
          (SELECT count(*) FROM upload_authorizations WHERE table_qr_id = s.table_qr_id AND status = 'consumed')
        END AS consumed,
        (SELECT count(*) FROM upload_authorizations a WHERE a.upload_session_id = s.id AND a.status = 'reserved') AS session_reserved,
        (SELECT count(*) FROM upload_authorizations a WHERE a.table_qr_id = s.table_qr_id AND a.status = 'reserved') AS family_reserved,
        CASE WHEN s.table_qr_id IS NULL THEN ${limit ?? 0} ELSE (SELECT max_photos FROM table_qrs WHERE id = s.table_qr_id AND event_id = s.event_id) END AS family_limit
      FROM upload_sessions s CROSS JOIN lock
      WHERE s.id = ${session.id} AND s.event_id = ${event.id}
    )
    INSERT INTO upload_authorizations (token, event_id, upload_session_id, table_qr_id, public_id, signed_at, expires_at)
    SELECT ${token}, event_id, id, table_qr_id, ${publicId}, ${signedAt}, now() + interval '24 hours'
    FROM eligible
    WHERE consumed + CASE WHEN table_qr_id IS NULL THEN session_reserved ELSE family_reserved END < CASE WHEN table_qr_id IS NULL THEN configured_limit ELSE family_limit END
    RETURNING *`;
  if (!rows[0]) return null;
  const authorization = rows[0] as UploadAuthorization;
  const configuredLimit = event.access_mode === "public_qr" ? event.max_photos_per_session : Number((await sql`SELECT max_photos FROM table_qrs WHERE id = ${session.table_qr_id} AND event_id = ${event.id}`)[0]?.max_photos ?? 0);
  const current = await uploadAllowance(event, session);
  return { authorization, uploaded: current?.uploaded ?? configuredLimit, limit: current?.limit ?? configuredLimit };
}

export async function findUploadAuthorization(token: string): Promise<UploadAuthorization | null> {
  const rows = await sql`SELECT * FROM upload_authorizations WHERE token = ${token} LIMIT 1`;
  return (rows[0] as UploadAuthorization) ?? null;
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

export async function isTableUploadPaused(tableQrId: string, eventId: string): Promise<boolean> {
  const rows = await sql`
    SELECT upload_paused FROM table_qrs WHERE id = ${tableQrId} AND event_id = ${eventId} LIMIT 1`;
  return Boolean(rows[0]?.upload_paused);
}

// Fotos subidas para una mesa (límite 24 por mesa/familia).
export async function countPhotosForTable(tableQrId: string): Promise<number> {
  const rows =
    await sql`SELECT count(*) AS n FROM photos WHERE table_qr_id = ${tableQrId}`;
  return Number(rows[0].n);
}
