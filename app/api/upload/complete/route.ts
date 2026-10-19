import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";
import { thumbnailUrl, verifyUploadedImage, classifyUploadedImage } from "@/lib/cloudinary";
import { broadcastPhotoAdded } from "@/lib/sse";
import { findSession, getEventById, findUploadAuthorization, touchSession, findTestRunById, completeTestRun } from "@/lib/upload-db";

const completeSchema = z.object({
  sessionToken: z.string().min(10).max(64),
  authorizationToken: z.string().min(10).max(64),
  publicId: z.string().min(1).max(255),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  mime: z.string().max(50).optional(),
  sizeKb: z.number().int().nonnegative().optional(),
  nsfwScore: z.number().min(0).max(1).optional(),
});

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = completeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const { sessionToken, authorizationToken, publicId } = parsed.data;
  const session = await findSession(sessionToken);
  if (!session) return NextResponse.json({ error: "Sesión inválida" }, { status: 403 });
  const event = await getEventById(session.event_id);
  if (!event) return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });
  if (!event.setup_complete || event.deletion_pending) return NextResponse.json({ error: "El evento no está disponible para cargar fotos" }, { status: 423 });

  const authorization = await findUploadAuthorization(authorizationToken);
  if (!authorization || authorization.event_id !== event.id || authorization.upload_session_id !== session.id) {
    return NextResponse.json({ error: "Autorización inválida" }, { status: 403 });
  }
  const testRun = authorization.test_run_id ? await findTestRunById(authorization.test_run_id) : null;
  const testMode = Boolean(authorization.test_run_id);
  if (testMode && (!testRun || testRun.event_id !== event.id || (testRun.status !== "active" && testRun.status !== "completed"))) {
    return NextResponse.json({ error: "La prueba ya no estÃ¡ disponible" }, { status: 410 });
  }
  const folder = testMode ? `weddings/${event.slug}/test/${authorization.test_run_id}` : `weddings/${event.slug}/${event.access_mode === "public_qr" ? "public" : "table"}`;
  if (publicId !== authorization.public_id && publicId !== `${folder}/${authorization.public_id}`) {
    return NextResponse.json({ error: "El recurso no coincide con la autorización" }, { status: 409 });
  }

  const existing = await sql`SELECT id FROM photos WHERE authorization_id = ${authorization.id} LIMIT 1`;
  if (existing.length) return NextResponse.json({ ok: true, duplicate: true, id: existing[0].id });
  if (authorization.status !== "reserved") return NextResponse.json({ error: "La autorización ya no está disponible" }, { status: 409 });

  const fullId = `${folder}/${authorization.public_id}`;
  let resource;
  try { resource = await verifyUploadedImage(fullId); }
  catch { return NextResponse.json({ error: "No se pudo verificar la foto en Cloudinary. Reintentá la confirmación." }, { status: 502 }); }
  const nsfwScore = await classifyUploadedImage(fullId, resource.version);
  const thumb = thumbnailUrl(fullId);
  const full = thumb.replace(/w_480/, "w_1920");
  const status = nsfwScore != null && nsfwScore < 0.7 ? "approved" : "pending";
  const inserted = await sql`
    WITH consumed AS (
      UPDATE upload_authorizations SET status = 'consumed', consumed_at = now()
      WHERE id = ${authorization.id} AND token = ${authorizationToken} AND status = 'reserved'
      RETURNING id
    ), bumped AS (
      UPDATE upload_sessions SET photo_count = photo_count + 1, last_seen_at = now()
      WHERE id = ${session.id} AND ${event.access_mode} = 'public_qr'
        AND EXISTS (SELECT 1 FROM consumed)
      RETURNING id
    )
    INSERT INTO photos (
      event_id, table_qr_id, upload_session_id, authorization_id, test_run_id,
      cloudinary_public_id, cloudinary_url, thumbnail_url,
      original_width, original_height, mime_type, size_kb,
      nsfw_score, status
    ) SELECT
      ${session.event_id}, ${session.table_qr_id}, ${session.id}, ${authorization.id}, ${authorization.test_run_id},
      ${fullId}, ${full}, ${thumb},
      ${resource.width}, ${resource.height}, ${resource.mime}, ${resource.sizeKb},
      ${nsfwScore ?? null}, ${status}
    FROM consumed
    RETURNING id`;
  if (!inserted.length) {
    const duplicate = await sql`SELECT id FROM photos WHERE authorization_id = ${authorization.id} LIMIT 1`;
    if (duplicate.length) return NextResponse.json({ ok: true, duplicate: true, id: duplicate[0].id });
    return NextResponse.json({ error: "La autorización ya no está disponible" }, { status: 409 });
  }
  await touchSession(session.id);
  if (testMode && authorization.test_run_id) await completeTestRun(authorization.test_run_id);
  if (!testMode) broadcastPhotoAdded({ id: inserted[0].id, url: thumb });
  return NextResponse.json({ ok: true, id: inserted[0].id });
}

