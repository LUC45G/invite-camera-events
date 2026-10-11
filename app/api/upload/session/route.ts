import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createSession,
  findGuestByTable,
  findSession,
  findTableQr,
  findPublicQr,
  getEventById,
  getTableDisplay,
  touchSession,
  uploadAllowance,
  isTableUploadPaused,
  findTestRun,
  createTestSession,
  testRunHasPhoto,
} from "@/lib/upload-db";
import { getUploadWindowState, uploadWindowError } from "@/lib/upload-window";

const sessionSchema = z.object({
  qr: z.string().min(10).max(64),
  sessionToken: z.string().max(64).optional(),
  confirmed: z.boolean().optional(),
  slug: z.string().min(1).max(100).optional(),
  accessMode: z.enum(["invitations", "public_qr"]).default("invitations"),
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

  const { qr, sessionToken, confirmed, slug, accessMode } = parsed.data;

  const testRun = await findTestRun(qr);
  if (testRun) {
    const event = await getEventById(testRun.event_id);
    if (!event || !slug || event.slug !== slug || !event.setup_complete || event.deletion_pending) {
      return NextResponse.json({ error: "QR de prueba invÃ¡lido" }, { status: 403 });
    }
    if (testRun.status !== "active" || new Date(testRun.expires_at) <= new Date()) {
      return NextResponse.json({ error: "El QR de prueba venciÃ³ o ya fue utilizado" }, { status: 410 });
    }
    let session = sessionToken ? await findSession(sessionToken) : null;
    if (session && (session.event_id !== event.id || session.test_run_id !== testRun.id)) {
      return NextResponse.json({ error: "La sesiÃ³n de prueba no coincide" }, { status: 409 });
    }
    session ??= await createTestSession(event.id, testRun.id, event.access_mode);
    await touchSession(session.id);
    const used = await testRunHasPhoto(testRun.id);
    return NextResponse.json({
      sessionToken: session.session_token,
      photoCount: used ? 1 : 0,
      remaining: used ? 0 : 1,
      accessMode: event.access_mode,
      testMode: true,
    });
  }

  if (accessMode === "public_qr") {
    const event = await findPublicQr(qr);
    if (!slug || !event || event.slug !== slug) return NextResponse.json({ error: "QR inválido" }, { status: 403 });
    if (!event.setup_complete || event.deletion_pending) {
      return NextResponse.json({ error: "La carga de fotos no está disponible" }, { status: 423 });
    }
    const uploadWindow = getUploadWindowState(event);
    if (!uploadWindow.canStartNewUpload) return NextResponse.json(uploadWindowError(uploadWindow), { status: 423 });
    let session = sessionToken ? await findSession(sessionToken) : null;
    if (session && (session.event_id !== event.id || session.access_mode !== "public_qr" || session.table_qr_id !== null)) {
      return NextResponse.json({ error: "La sesión pertenece a otro evento o modalidad" }, { status: 409 });
    }
    session ??= await createSession(event.id, null, "public_qr");
    await touchSession(session.id);
    return NextResponse.json({ sessionToken: session.session_token, photoCount: session.photo_count,
      remaining: Math.max(0, event.max_photos_per_session - session.photo_count), accessMode: "public_qr" });
  }

  // La familia escaneada se valida primero: todo lo demás depende de ella.
  const table = await findTableQr(qr);
  if (!table) {
    return NextResponse.json({ error: "QR inválido" }, { status: 403 });
  }

  const event = await getEventById(table.event_id);
  if (!event) {
    return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });
  }
  if (event.access_mode !== "invitations" || (slug && event.slug !== slug)) {
    return NextResponse.json({ error: "QR inválido" }, { status: 403 });
  }
  if (!event.setup_complete || event.deletion_pending) {
    return NextResponse.json({ error: "El organizador debe completar la configuración del evento" }, { status: 423 });
  }
  const uploadWindow = getUploadWindowState(event);
  if (!uploadWindow.canStartNewUpload) return NextResponse.json(uploadWindowError(uploadWindow), { status: 423 });
  if (await isTableUploadPaused(table.id, event.id)) {
    return NextResponse.json({ error: "La carga de esta familia estÃ¡ pausada" }, { status: 423 });
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
      if (session.event_id !== event.id || (session.access_mode ?? "invitations") !== "invitations") {
        return NextResponse.json({ error: "La sesión pertenece a otro evento o modalidad" }, { status: 409 });
      }
      if (session.table_qr_id !== table.id) {
        const locked = session.table_qr_id ? await getTableDisplay(session.table_qr_id) : null;
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
      const allowance = await uploadAllowance(event, session);
      return NextResponse.json({
        sessionToken: session.session_token,
        tableQrId: session.table_qr_id,
        photoCount: session.photo_count,
        remaining: allowance ? Math.max(0, allowance.limit - allowance.uploaded) : 0,
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
  const allowance = await uploadAllowance(event, session);
  return NextResponse.json({
    sessionToken: session.session_token,
    tableQrId: session.table_qr_id,
    photoCount: 0,
    remaining: allowance ? Math.max(0, allowance.limit - allowance.uploaded) : 0,
    ...tableInfo,
  });
}
