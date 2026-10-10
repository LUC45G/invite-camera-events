import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";
import { thumbnailUrl } from "@/lib/cloudinary";
import { broadcastPhotoAdded } from "@/lib/sse";
import {
  uploadAllowance,
  findSession,
  getEventById,
  touchSession,
} from "@/lib/upload-db";

const completeSchema = z.object({
  sessionToken: z.string().min(10).max(64),
  publicId: z.string().min(1).max(255),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  mime: z.string().max(50).optional(),
  sizeKb: z.number().int().nonnegative().optional(),
  nsfwScore: z.number().min(0).max(1).optional(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = completeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const { sessionToken, publicId, width, height, mime, sizeKb, nsfwScore } = parsed.data;

  const session = await findSession(sessionToken);
  if (!session) {
    return NextResponse.json({ error: "Sesión inválida" }, { status: 403 });
  }

  const event = await getEventById(session.event_id);
  if (!event) {
    return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });
  }
  if (!event.setup_complete || event.deletion_pending) {
    return NextResponse.json({ error: "El evento no está disponible para cargar fotos" }, { status: 423 });
  }
  if (!event.upload_open) {
    return NextResponse.json(
      { error: "La carga de fotos está cerrada" },
      { status: 423 },
    );
  }

  const allowance = await uploadAllowance(event, session);
  if (!allowance) return NextResponse.json({ error: "Sesión inválida para este evento" }, { status: 403 });
  // Idempotencia dentro de la sesión y evento autorizados.
  const existing =
    await sql`SELECT id FROM photos WHERE cloudinary_public_id = ${publicId} AND event_id = ${event.id} AND upload_session_id = ${session.id} LIMIT 1`;
  if (existing.length > 0) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const { uploaded, limit } = allowance;
  if (uploaded >= limit) {
    return NextResponse.json(
      { error: event.access_mode === "public_qr" ? "Alcanzaste el límite de fotos" : "Esta familia alcanzó el límite de fotos" },
      { status: 409 },
    );
  }

  const thumb = thumbnailUrl(publicId);
  // Full: misma transformación con ancho 1920
  const full = thumb.replace(/w_480/, "w_1920");

  // Auto-aprueba si el score NSFW es menor a 50%; si no hay score o es >=50% queda pendiente para moderación
  const status = nsfwScore != null && nsfwScore < 0.5 ? "approved" : "pending";

  const inserted = await sql`
    WITH consumed AS (
      UPDATE upload_sessions SET photo_count = photo_count + 1, last_seen_at = now()
      WHERE id = ${session.id} AND event_id = ${event.id}
        AND (${event.access_mode} <> 'public_qr' OR photo_count < ${limit})
      RETURNING id
    )
    INSERT INTO photos (
      event_id, table_qr_id, upload_session_id,
      cloudinary_public_id, cloudinary_url, thumbnail_url,
      original_width, original_height, mime_type, size_kb,
      nsfw_score, status
    ) SELECT
      ${session.event_id}, ${session.table_qr_id}, ${session.id},
      ${publicId}, ${full}, ${thumb},
      ${width ?? null}, ${height ?? null}, ${mime ?? null}, ${sizeKb ?? null},
      ${nsfwScore ?? null}, ${status}
    FROM consumed
    RETURNING id`;
  if (!inserted.length) return NextResponse.json({ error: "Alcanzaste el límite de fotos" }, { status: 409 });
  await touchSession(session.id);

  broadcastPhotoAdded({ id: inserted[0].id, url: thumb });

  return NextResponse.json({ ok: true, id: inserted[0].id });
}
