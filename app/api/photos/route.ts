import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

// Lista de fotos aprobadas del evento (slideshow + galería después del reveal).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ error: "Falta slug" }, { status: 400 });
  }

  const after = searchParams.get("after");

  const rows = after
    ? await sql`
        SELECT p.id, p.cloudinary_url, p.thumbnail_url, p.created_at
        FROM photos p
        JOIN events e ON e.id = p.event_id
        WHERE e.slug = ${slug}
          AND p.status = 'approved'
          AND p.thumbnail_url IS NOT NULL
          AND p.created_at > ${after}
        ORDER BY p.created_at ASC
        LIMIT 200`
    : await sql`
        SELECT p.id, p.cloudinary_url, p.thumbnail_url, p.created_at
        FROM photos p
        JOIN events e ON e.id = p.event_id
        WHERE e.slug = ${slug}
          AND p.status = 'approved'
          AND p.thumbnail_url IS NOT NULL
        ORDER BY p.created_at ASC
        LIMIT 200`;

  return NextResponse.json({ photos: rows });
}
