import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getEventBySlug } from "@/lib/upload-db";
import { z } from "zod";

export const dynamic = "force-dynamic";

// Lista de fotos aprobadas del evento (slideshow + galería después del reveal).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ error: "Falta slug" }, { status: 400 });
  }
  const event = await getEventBySlug(slug);
  if (!event) return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });

  const after = searchParams.get("after");
  const offset = z.coerce.number().int().min(0).safeParse(searchParams.get("offset") ?? 0);
  if (!offset.success) return NextResponse.json({ error: "Página inválida" }, { status: 400 });

  const rows = after
    ? await sql`
        SELECT p.id, p.cloudinary_url, p.thumbnail_url, p.created_at
        FROM photos p
        JOIN events e ON e.id = p.event_id
        WHERE p.event_id = ${event.id}
          AND p.status = 'approved'
          AND p.test_run_id IS NULL
          AND p.thumbnail_url IS NOT NULL
          AND p.created_at > ${after}
        ORDER BY p.created_at ASC, p.id ASC
        LIMIT 201 OFFSET ${offset.data}`
    : await sql`
        SELECT p.id, p.cloudinary_url, p.thumbnail_url, p.created_at
        FROM photos p
        JOIN events e ON e.id = p.event_id
        WHERE p.event_id = ${event.id}
          AND p.status = 'approved'
          AND p.test_run_id IS NULL
          AND p.thumbnail_url IS NOT NULL
        ORDER BY p.created_at ASC, p.id ASC
        LIMIT 201 OFFSET ${offset.data}`;

  return NextResponse.json({ photos: rows.slice(0, 200), nextOffset: rows.length > 200 ? offset.data + 200 : null });
}
