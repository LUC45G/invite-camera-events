import { sql, type Event, type TableQr, type UploadAuthorization, type UploadSession, type UploadTestRun } from "@/lib/db";
import { env } from "@/lib/env";
import { randomBytes } from "node:crypto";

// Utilidades de DB para el flujo de subida (fase 1).
// Todas las queries van contra Neon vía el driver serverless.

export async function getEventBySlug(slug: string): Promise<Event | null> {
  const rows = await sql`
    SELECT * FROM events
    WHERE slug = ${slug}
      AND slug = ${env.EVENT_SLUG}
      AND deployment_id = ${env.DEPLOYMENT_ID}
      AND hostname = ${env.EVENT_HOSTNAME}
    LIMIT 1`;
  return (rows[0] as Event) ?? null;
}

export async function getEventById(id: string): Promise<Event | null> {
  const rows = await sql`
    SELECT * FROM events
    WHERE id = ${id}
      AND slug = ${env.EVENT_SLUG}
      AND deployment_id = ${env.DEPLOYMENT_ID}
      AND hostname = ${env.EVENT_HOSTNAME}
    LIMIT 1`;
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
  const rows = await sql`SELECT * FROM events WHERE public_qr_token = ${qrToken} AND access_mode = 'public_qr'
    AND slug = ${env.EVENT_SLUG} AND deployment_id = ${env.DEPLOYMENT_ID} AND hostname = ${env.EVENT_HOSTNAME} LIMIT 1`;
  return (rows[0] as Event) ?? null;
}

export async function findTestRun(token: string): Promise<UploadTestRun | null> {
  const rows = await sql`SELECT * FROM upload_test_runs WHERE token = ${token} LIMIT 1`;
  return (rows[0] as UploadTestRun) ?? null;
}

export async function findTestRunById(id: string): Promise<UploadTestRun | null> {
  const rows = await sql`SELECT * FROM upload_test_runs WHERE id = ${id} LIMIT 1`;
  return (rows[0] as UploadTestRun) ?? null;
}

export async function createTestRun(eventId: string): Promise<UploadTestRun> {
  const token = randomBytes(32).toString("hex");
  const rows = await sql`
    INSERT INTO upload_test_runs (event_id, token, expires_at)
    VALUES (${eventId}, ${token}, now() + interval '30 minutes')
    RETURNING *`;
  return rows[0] as UploadTestRun;
}

export async function createTestSession(eventId: string, testRunId: string, accessMode: Event["access_mode"]): Promise<UploadSession> {
  const sessionToken = randomBytes(32).toString("hex");
  const rows = await sql`
    INSERT INTO upload_sessions (event_id, table_qr_id, session_token, access_mode, test_run_id)
    VALUES (${eventId}, NULL, ${sessionToken}, ${accessMode}, ${testRunId})
    RETURNING *`;
  return rows[0] as UploadSession;
}

export async function testRunHasPhoto(testRunId: string): Promise<boolean> {
  const rows = await sql`
    SELECT 1 FROM photos p WHERE p.test_run_id = ${testRunId}
    UNION ALL
    SELECT 1 FROM upload_authorizations a WHERE a.test_run_id = ${testRunId} AND a.status = 'reserved'
    LIMIT 1`;
  return rows.length > 0;
}

export async function reserveTestUploadAuthorization(event: Event, session: UploadSession, publicId: string, signedAt: number, token: string): Promise<{ authorization: UploadAuthorization; uploaded: number; limit: number } | null> {
  if (!session.test_run_id) return null;
  const [, rows] = await sql.transaction([
    sql`SELECT pg_advisory_xact_lock(hashtext(${session.test_run_id}))`,
    sql`WITH run AS (
      SELECT id, event_id FROM upload_test_runs
      WHERE id = ${session.test_run_id} AND event_id = ${event.id}
        AND status = 'active' AND expires_at > now()
    )
    INSERT INTO upload_authorizations (token, event_id, upload_session_id, table_qr_id, public_id, signed_at, expires_at, test_run_id)
    SELECT ${token}, event_id, ${session.id}, NULL, ${publicId}, ${signedAt}, now() + interval '30 minutes', id
    FROM run
    WHERE NOT EXISTS (SELECT 1 FROM photos WHERE test_run_id = run.id)
      AND NOT EXISTS (SELECT 1 FROM upload_authorizations WHERE test_run_id = run.id AND status = 'reserved')
    RETURNING *`,
  ]);
  if (!rows[0]) return null;
  return { authorization: rows[0] as UploadAuthorization, uploaded: 1, limit: 1 };
}

export async function completeTestRun(testRunId: string): Promise<void> {
  await sql`UPDATE upload_test_runs SET status = 'completed', completed_at = now() WHERE id = ${testRunId} AND status = 'active'`;
}

// Both signing and completion must validate the session's event and mode.
export async function uploadAllowance(event: Event, session: UploadSession) {
  if (session.event_id !== event.id || (session.access_mode ?? "invitations") !== event.access_mode) return null;
  if (event.access_mode === "public_qr") {
    if (session.table_qr_id !== null) return null;
    await releaseExpiredAuthorizations(event.id);
    const rows = await sql`SELECT count(*) AS n FROM upload_authorizations WHERE upload_session_id = ${session.id} AND status = 'reserved'`;
    return { uploaded: Number(session.photo_count) + Number(rows[0]?.n ?? 0), limit: event.max_photos_per_session };
  }
  if (!session.table_qr_id) return null;
  const rows = await sql`SELECT max_photos FROM table_qrs WHERE id = ${session.table_qr_id} AND event_id = ${event.id} LIMIT 1`;
  if (!rows[0]) return null;
  await releaseExpiredAuthorizations(event.id);
  const consumed = await sql`
    SELECT
      (SELECT legacy_photo_count FROM table_qrs WHERE id = ${session.table_qr_id}) +
      (SELECT count(*) FROM upload_authorizations WHERE table_qr_id = ${session.table_qr_id} AND status = 'consumed') AS n`;
  const reserved = await sql`SELECT count(*) AS n FROM upload_authorizations WHERE table_qr_id = ${session.table_qr_id} AND status = 'reserved'`;
  return { uploaded: Number(consumed[0]?.n ?? 0) + Number(reserved[0]?.n ?? 0), limit: Number(rows[0].max_photos) };
}

export async function releaseExpiredAuthorizations(eventId: string): Promise<void> {
  await sql`UPDATE upload_authorizations SET status = 'released' WHERE event_id = ${eventId} AND status = 'reserved' AND expires_at <= now()`;
}

export async function reserveUploadAuthorization(event: Event, session: UploadSession, publicId: string, signedAt: number, token: string): Promise<{ authorization: UploadAuthorization; uploaded: number; limit: number } | null> {
  await releaseExpiredAuthorizations(event.id);
  const scope = session.table_qr_id ?? session.id;
  const limit = event.access_mode === "public_qr" ? event.max_photos_per_session : null;
  // A separate lock statement gives the following statement a fresh committed snapshot.
  const [, rows] = await sql.transaction([
    sql`SELECT pg_advisory_xact_lock(hashtext(${scope}))`,
    sql`WITH eligible AS (
      SELECT s.id, s.event_id, s.table_qr_id,
        ${limit ?? 0}::int AS configured_limit,
        CASE WHEN s.table_qr_id IS NULL THEN s.photo_count ELSE
          (SELECT legacy_photo_count FROM table_qrs WHERE id = s.table_qr_id) +
          (SELECT count(*) FROM upload_authorizations WHERE table_qr_id = s.table_qr_id AND status = 'consumed')
        END AS consumed,
        (SELECT count(*) FROM upload_authorizations a WHERE a.upload_session_id = s.id AND a.status = 'reserved') AS session_reserved,
        (SELECT count(*) FROM upload_authorizations a WHERE a.table_qr_id = s.table_qr_id AND a.status = 'reserved') AS family_reserved,
        CASE WHEN s.table_qr_id IS NULL THEN ${limit ?? 0} ELSE (SELECT max_photos FROM table_qrs WHERE id = s.table_qr_id AND event_id = s.event_id) END AS family_limit
      FROM upload_sessions s
      WHERE s.id = ${session.id} AND s.event_id = ${event.id}
    )
    INSERT INTO upload_authorizations (token, event_id, upload_session_id, table_qr_id, public_id, signed_at, expires_at)
    SELECT ${token}, event_id, id, table_qr_id, ${publicId}, ${signedAt}, now() + interval '24 hours'
    FROM eligible
    WHERE consumed + CASE WHEN table_qr_id IS NULL THEN session_reserved ELSE family_reserved END < CASE WHEN table_qr_id IS NULL THEN configured_limit ELSE family_limit END
    RETURNING *`,
  ]);
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
