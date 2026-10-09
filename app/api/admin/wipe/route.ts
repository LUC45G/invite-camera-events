import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";
import { isAdmin } from "@/lib/admin-auth";
import { cloudinary } from "@/lib/cloudinary";
import { getAdminEvent } from "@/lib/event-context";
import { deleteEventData } from "@/lib/event-deletion";

export const dynamic = "force-dynamic";

const wipeSchema = z.object({
  slug: z.string().min(1).max(100),
  confirmation: z.literal("BORRAR TODO"),
}).strict();

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  const parsed = wipeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Escribí exactamente BORRAR TODO para confirmar" }, { status: 400 });
  const event = await getAdminEvent(parsed.data.slug, true);
  if (!event) return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });
  try {
    const deletedPhotos = await deleteEventData(
      async (text, values) => await sql.query(text, values),
      async (ids) => await cloudinary.api.delete_resources(ids, { resource_type: "image", type: "upload", invalidate: true }),
      event.id,
    );
    return NextResponse.json({ ok: true, event: event.slug, deletedPhotos });
  } catch {
    return NextResponse.json({ error: "No se pudo completar el borrado. Los datos se conservan para reintentar y la carga permanece bloqueada." }, { status: 502 });
  }
}
