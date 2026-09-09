import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";
import { isAdmin } from "@/lib/admin-auth";
import { cloudinary } from "@/lib/cloudinary";
import { broadcastPhotoAdded } from "@/lib/sse";

export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ error: "No autorizado" }, { status: 401 });
}

// GET: todas las fotos (pendientes primero, NSFW con prioridad) + stats
export async function GET(request: Request) {
  if (!(await isAdmin())) return unauthorized();

  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug") ?? "nuestra-boda";

  const photos = await sql`
    SELECT p.id, p.cloudinary_public_id, p.cloudinary_url, p.thumbnail_url,
           p.status, p.nsfw_score, p.created_at
    FROM photos p
    JOIN events e ON e.id = p.event_id
    WHERE e.slug = ${slug}
    ORDER BY
      CASE p.status WHEN 'pending' THEN 0 ELSE 1 END,
      p.nsfw_score DESC NULLS LAST,
      p.created_at DESC
    LIMIT 500`;

  const stats = await sql`
    SELECT status, count(*) AS n FROM photos p
    JOIN events e ON e.id = p.event_id
    WHERE e.slug = ${slug}
    GROUP BY status`;

  return NextResponse.json({ photos, stats });
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

  const rows = await sql`SELECT * FROM photos WHERE id = ${id} LIMIT 1`;
  const photo = rows[0] as
    | { id: string; cloudinary_public_id: string; status: string; event_id: string }
    | undefined;
  if (!photo) {
    return NextResponse.json({ error: "Foto no encontrada" }, { status: 404 });
  }

  if (action === "approve" || action === "reject") {
    const status = action === "approve" ? "approved" : "rejected";
    await sql`UPDATE photos SET status = ${status} WHERE id = ${id}`;
    if (status === "approved") {
      broadcastPhotoAdded({ id: photo.id, url: "" });
    }
    return NextResponse.json({ ok: true, status });
  }

  // delete: permanente — de Cloudinary y de la DB
  try {
    await cloudinary.uploader.destroy(photo.cloudinary_public_id);
  } catch {
    // si falla el destroy, igual quitamos la referencia de la DB
  }
  await sql`DELETE FROM photos WHERE id = ${id}`;
  return NextResponse.json({ ok: true, deleted: true });
}
