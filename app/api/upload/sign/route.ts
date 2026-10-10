import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { signUpload } from "@/lib/cloudinary";
import {
  uploadAllowance,
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

  const allowance = await uploadAllowance(event, session);
  if (!allowance) return NextResponse.json({ error: "Sesión inválida para este evento" }, { status: 403 });
  const { uploaded, limit } = allowance;
  if (uploaded >= limit) {
    return NextResponse.json(
      { error: event.access_mode === "public_qr" ? "Alcanzaste el límite de fotos" : "Esta familia alcanzó el límite de fotos" },
      { status: 409 },
    );
  }

  await touchSession(session.id);

  const folder = `weddings/${event.slug}/${event.access_mode === "public_qr" ? "public" : "table"}`;
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
