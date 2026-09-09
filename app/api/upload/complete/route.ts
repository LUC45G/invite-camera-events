import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";
import { thumbnailUrl } from "@/lib/cloudinary";
import { broadcastPhotoAdded } from "@/lib/sse";
import {
  countPhotosForTable,
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

  // Idempotencia: no registrar el mismo publicId dos veces
  const existing =
    await sql`SELECT id FROM photos WHERE cloudinary_public_id = ${publicId} LIMIT 1`;
  if (existing.length > 0) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const uploaded = await countPhotosForTable(session.table_qr_id);
  if (uploaded >= event.max_photos_per_session) {
    return NextResponse.json(
      { error: "Esta mesa alcanzó el límite de fotos" },
      { status: 409 },
    );
  }

  const thumb = thumbnailUrl(publicId);
  // Full: misma transformación con ancho 1920
  const full = thumb.replace(/w_480/, "w_1920");

  const inserted = await sql`
    INSERT INTO photos (
      event_id, table_qr_id, upload_session_id,
      cloudinary_public_id, cloudinary_url, thumbnail_url,
      original_width, original_height, mime_type, size_kb,
      nsfw_score, status
    ) VALUES (
      ${session.event_id}, ${session.table_qr_id}, ${session.id},
      ${publicId}, ${full}, ${thumb},
      ${width ?? null}, ${height ?? null}, ${mime ?? null}, ${sizeKb ?? null},
      ${nsfwScore ?? null}, 'pending'
    )
    RETURNING id`;

  await sql`
    UPDATE upload_sessions
    SET photo_count = photo_count + 1, last_seen_at = now()
    WHERE id = ${session.id}`;

  broadcastPhotoAdded({ id: inserted[0].id, url: thumb });

  return NextResponse.json({ ok: true, id: inserted[0].id });
}

void touchSession;
