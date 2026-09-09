import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createSession,
  findSession,
  findTableQr,
  getEventById,
  touchSession,
} from "@/lib/upload-db";

const sessionSchema = z.object({
  qr: z.string().min(10).max(64),
  sessionToken: z.string().max(64).optional(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = sessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const { qr, sessionToken } = parsed.data;

  // Reanudar sesión existente del dispositivo
  if (sessionToken) {
    const session = await findSession(sessionToken);
    if (session) {
      const event = await getEventById(session.event_id);
      if (event) {
        await touchSession(session.id);
        return NextResponse.json({
          sessionToken: session.session_token,
          tableQrId: session.table_qr_id,
          photoCount: session.photo_count,
        });
      }
    }
    // Token de sesión inválido/expirado: arrancar de nuevo con el QR
  }

  const table = await findTableQr(qr);
  if (!table) {
    return NextResponse.json({ error: "QR inválido" }, { status: 403 });
  }

  const event = await getEventById(table.event_id);
  if (!event) {
    return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });
  }
  if (!event.upload_open) {
    return NextResponse.json(
      { error: "La carga de fotos está cerrada" },
      { status: 423 },
    );
  }

  const session = await createSession(event.id, table.id);
  return NextResponse.json({
    sessionToken: session.session_token,
    tableQrId: session.table_qr_id,
    photoCount: 0,
  });
}
