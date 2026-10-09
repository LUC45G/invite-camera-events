import { NextResponse } from "next/server";
import JSZip from "jszip";
import { sql } from "@/lib/db";
import { isAdmin } from "@/lib/admin-auth";

import { getAdminEvent } from "@/lib/event-context";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ZIP con todas las fotos aprobadas (solo organizador).
export async function GET(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const event = await getAdminEvent(searchParams.get("slug"));
  if (!event) return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });

  const photos = (await sql`
    SELECT cloudinary_url FROM photos p
    JOIN events e ON e.id = p.event_id
    WHERE e.id = ${event.id} AND p.status = 'approved'
    ORDER BY p.created_at ASC
  `) as { cloudinary_url: string }[];

  if (photos.length === 0) {
    return NextResponse.json(
      { error: "No hay fotos aprobadas" },
      { status: 404 },
    );
  }

  const zip = new JSZip();
  let i = 0;
  for (const p of photos) {
    try {
      const res = await fetch(p.cloudinary_url);
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      zip.file(`foto-${String(++i).padStart(3, "0")}.jpg`, buf);
    } catch {
      // saltear foto fallida sin abortar el zip
    }
  }

  const content = await zip.generateAsync({ type: "blob" });
  return new Response(content, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${event.slug}-fotos.zip"`,
    },
  });
}
