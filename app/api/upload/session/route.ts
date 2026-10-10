import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createSession,
  findGuestByTable,
  findSession,
  findTableQr,
  getEventById,
  getTableDisplay,
  touchSession,
} from "@/lib/upload-db";

const sessionSchema = z.object({
  qr: z.string().min(10).max(64),
  sessionToken: z.string().max(64).optional(),
  confirmed: z.boolean().optional(),
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

  const { qr, sessionToken, confirmed } = parsed.data;

  // La familia escaneada se valida primero: todo lo demás depende de ella.
  const table = await findTableQr(qr);
  if (!table) {
    return NextResponse.json({ error: "QR inválido" }, { status: 403 });
  }

  const event = await getEventById(table.event_id);
  if (!event) {
    return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });
  }
  if (!event.setup_complete || event.deletion_pending) {
    return NextResponse.json({ error: "El organizador debe completar la configuración del evento" }, { status: 423 });
  }
  if (!event.upload_open) {
    return NextResponse.json(
      { error: "La carga de fotos está cerrada" },
      { status: 423 },
    );
  }

  // Solo las familias que confirmaron asistencia pueden usar la cámara.
  // Pendientes o rechazadas vuelven a la invitación con aviso.
  const guests = await findGuestByTable(table.id);
  if (!guests || guests.rsvp_status !== "accepted") {
    return NextResponse.json(
      { error: "Familia sin confirmación", rsvpRequired: true },
      { status: 403 },
    );
  }

  const display = await getTableDisplay(table.id);
  const tableInfo = {
    tableNumber: display?.table_number ?? table.table_number,
    tableName: display?.guest_name ?? `Familia ${table.table_number}`,
  };

  // Reanudar sesión existente del dispositivo, solo si es de esta familia.
  // El dispositivo queda ligado a la primera familia que escaneó.
  if (sessionToken) {
    const session = await findSession(sessionToken);
    if (session) {
      if (session.table_qr_id !== table.id) {
        const locked = await getTableDisplay(session.table_qr_id);
        return NextResponse.json(
          {
            error: "Este dispositivo ya está vinculado a otra familia",
            lockedTable: {
              tableNumber: locked?.table_number ?? null,
              tableName: locked?.guest_name ?? "tu familia",
            },
          },
          { status: 409 },
        );
      }
      await touchSession(session.id);
      return NextResponse.json({
        sessionToken: session.session_token,
        tableQrId: session.table_qr_id,
        photoCount: session.photo_count,
        ...tableInfo,
      });
    }
    // Token de sesión inválido/expirado: sigue el flujo de vinculación
  }

  // Vinculación explícita: sin confirmación solo se informa la familia,
  // sin crear sesión. Vincular restringe el dispositivo, así que se pide Sí/No.
  if (!confirmed) {
    return NextResponse.json({ confirm: true, ...tableInfo });
  }

  const session = await createSession(event.id, table.id);
  return NextResponse.json({
    sessionToken: session.session_token,
    tableQrId: session.table_qr_id,
    photoCount: 0,
    ...tableInfo,
  });
}
