import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { signUpload } from "@/lib/cloudinary";
import { sql } from "@/lib/db";
import {
  countPhotosForTable,
  findSession,
  getEventById,
  touchSession,
} from "@/lib/upload-db";

const signSchema = z.object({
  sessionToken: z.string().min(10).max(64),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = signSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const session = await findSession(parsed.data.sessionToken);
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

  // Límite de fotos por mesa (configurable por QR, default 24)
  const uploaded = await countPhotosForTable(session.table_qr_id);
  const tableRows = (await sql`SELECT max_photos FROM table_qrs WHERE id = ${session.table_qr_id} LIMIT 1`) as {
    max_photos: number;
  }[];
  const limit = Number(tableRows[0]?.max_photos ?? event.max_photos_per_session ?? 24);
  if (uploaded >= limit) {
    return NextResponse.json(
      { error: "Esta mesa alcanzó el límite de fotos" },
      { status: 409 },
    );
  }

  await touchSession(session.id);

  const folder = `weddings/${event.slug}/table`;
  const { timestamp, signature, apiKey } = signUpload(folder);

  return NextResponse.json({
    timestamp,
    signature,
    apiKey,
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    folder,
    remaining: limit - uploaded,
  });
}
