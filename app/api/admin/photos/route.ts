import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";
import { isAdmin } from "@/lib/admin-auth";
import { cloudinary } from "@/lib/cloudinary";
import { broadcastPhotosChanged } from "@/lib/sse";
import { deleteResourcesConfirmed } from "@/lib/resource-deletion";

import { getAdminEvent } from "@/lib/event-context";

export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ error: "No autorizado" }, { status: 401 });
}

// GET: todas las fotos (pendientes primero, NSFW con prioridad) + stats
export async function GET(request: Request) {
  if (!(await isAdmin())) return unauthorized();

  const { searchParams } = new URL(request.url);
  const event = await getAdminEvent(searchParams.get("slug"));
  if (!event) return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });
  const offset = z.coerce.number().int().min(0).safeParse(searchParams.get("offset") ?? 0);
  if (!offset.success) return NextResponse.json({ error: "Página inválida" }, { status: 400 });

  const photos = await sql`
    SELECT p.id, p.cloudinary_public_id, p.cloudinary_url, p.thumbnail_url,
           p.status, p.nsfw_score, p.created_at
    FROM photos p
    JOIN events e ON e.id = p.event_id
    WHERE e.id = ${event.id} AND p.test_run_id IS NULL
    ORDER BY
      CASE p.status WHEN 'pending' THEN 0 ELSE 1 END,
      p.nsfw_score DESC NULLS LAST,
       p.created_at DESC, p.id ASC
    LIMIT 501 OFFSET ${offset.data}`;

  const stats = await sql`
    SELECT status, count(*) AS n FROM photos p
    JOIN events e ON e.id = p.event_id
    WHERE e.id = ${event.id} AND p.test_run_id IS NULL
    GROUP BY status`;

  return NextResponse.json({ photos: photos.slice(0, 500), stats, nextOffset: photos.length > 500 ? offset.data + 500 : null });
}

const actionSchema = z.object({
  id: z.string().uuid(),
  action: z.enum(["approve", "reject", "delete"]),
});

export async function POST(request: Request) {
  if (!(await isAdmin())) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const { id, action } = parsed.data;
  const event = await getAdminEvent();
  if (!event) return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });

  const rows = await sql`SELECT * FROM photos WHERE id = ${id} AND event_id = ${event.id} AND test_run_id IS NULL LIMIT 1`;
  const photo = rows[0] as
    | { id: string; cloudinary_public_id: string; status: string; event_id: string }
    | undefined;
  if (!photo) {
    return NextResponse.json({ error: "Foto no encontrada" }, { status: 404 });
  }

  if (action === "approve" || action === "reject") {
    const status = action === "approve" ? "approved" : "rejected";
    await sql`UPDATE photos SET status = ${status} WHERE id = ${id} AND event_id = ${event.id}`;
    broadcastPhotosChanged({ id: photo.id, status });
    return NextResponse.json({ ok: true, status });
  }

  // delete: permanente — de Cloudinary y de la DB
  try {
    await deleteResourcesConfirmed((ids) => cloudinary.api.delete_resources(ids, { resource_type: "image", type: "upload", invalidate: true }), [photo.cloudinary_public_id]);
  } catch {
    return NextResponse.json({ error: "No se pudo borrar la foto en Cloudinary. Se conserva para reintentar." }, { status: 502 });
  }
  await sql`DELETE FROM photos WHERE id = ${id} AND event_id = ${event.id}`;
  broadcastPhotosChanged({ id: photo.id, deleted: true });
  return NextResponse.json({ ok: true, deleted: true });
}
