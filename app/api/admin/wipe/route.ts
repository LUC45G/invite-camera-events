import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";
import { isAdmin } from "@/lib/admin-auth";
import { cloudinary } from "@/lib/cloudinary";

import { getAdminEvent } from "@/lib/event-context";

export const dynamic = "force-dynamic";

const wipeSchema = z.object({
  slug: z.string().min(1).max(100),
  confirmation: z.literal("BORRAR TODO"),
});

function unauthorized() {
  return NextResponse.json({ error: "No autorizado" }, { status: 401 });
}

function chunk<T>(values: T[], size: number): T[][] {
  const groups: T[][] = [];
  for (let i = 0; i < values.length; i += size) {
    groups.push(values.slice(i, i + size));
  }
  return groups;
}

export async function POST(request: Request) {
  if (!(await isAdmin())) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = wipeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Escribí exactamente BORRAR TODO para confirmar" },
      { status: 400 },
    );
  }

  const event = await getAdminEvent(parsed.data.slug);
  if (!event) return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });

  const photos = (await sql`
    SELECT cloudinary_public_id FROM photos WHERE event_id = ${event.id}
  `) as { cloudinary_public_id: string }[];
  const publicIds = photos.map((photo) => photo.cloudinary_public_id);

  try {
    for (const group of chunk(publicIds, 100)) {
      await cloudinary.api.delete_resources(group, {
        resource_type: "image",
        type: "upload",
      });
    }
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `No se pudo borrar Cloudinary: ${error.message}`
            : "No se pudo borrar Cloudinary",
      },
      { status: 502 },
    );
  }

  // Las tablas dependientes (fotos, sesiones, invitados y QR) se borran en cascada.
  await sql`DELETE FROM events WHERE id = ${event.id}`;

  return NextResponse.json({
    ok: true,
    event: event.slug,
    deletedPhotos: publicIds.length,
    deletedCloudinary: publicIds.length,
  });
}
