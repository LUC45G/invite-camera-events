import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { signUpload } from "@/lib/cloudinary";
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
  if (!event.upload_open) {
    return NextResponse.json(
      { error: "La carga de fotos está cerrada" },
      { status: 423 },
    );
  }

  // Límite de fotos por mesa (fotos de todos los dispositivos de la mesa)
  const uploaded = await countPhotosForTable(session.table_qr_id);
  if (uploaded >= event.max_photos_per_session) {
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
    remaining: event.max_photos_per_session - uploaded,
  });
}
