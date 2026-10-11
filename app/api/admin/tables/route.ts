import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";
import { isAdmin } from "@/lib/admin-auth";

import { getAdminInvitationEvent as getAdminEvent } from "@/lib/event-context";
import { getUploadWindowState } from "@/lib/upload-window";

export const dynamic = "force-dynamic";

// Lista de mesas con sus tokens (solo admin). El cliente arma las URLs
// con su propio origin para que funcione en cualquier entorno.
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const event = await getAdminEvent();
  if (!event) return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });

  const rows = (await sql`
    SELECT t.table_number, t.qr_token, t.max_photos, t.upload_paused, g.name AS guest_name
    FROM table_qrs t
    LEFT JOIN guests g ON g.table_qr_id = t.id
    WHERE t.event_id = ${event.id}
    ORDER BY t.table_number ASC
  `) as { table_number: number; qr_token: string; max_photos: number; upload_paused: boolean; guest_name: string | null }[];

  return NextResponse.json({ tables: rows });
}

// Agrega una mesa nueva (número = máx + 1) con token corto + invitado.
export async function POST() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const event = await getAdminEvent();
  if (!event) return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });
  if (!getUploadWindowState(event).canEditSetup) return NextResponse.json({ error: "Las familias y sus cupos están bloqueados desde la apertura de la carga" }, { status: 409 });

  const maxRows = (await sql`
    SELECT COALESCE(MAX(table_number), 0) AS max FROM table_qrs WHERE event_id = ${event.id}
  `) as { max: string }[];
  const tableNumber = Number(maxRows[0]?.max ?? 0) + 1;

  const qrRows = (await sql`
    INSERT INTO table_qrs (event_id, table_number, qr_token)
    VALUES (${event.id}, ${tableNumber}, encode(gen_random_bytes(6), 'hex'))
    RETURNING id, qr_token
  `) as { id: string; qr_token: string }[];
  const qr = qrRows[0];

  await sql`
    INSERT INTO guests (event_id, table_qr_id, token, name)
    VALUES (${event.id}, ${qr.id}, ${qr.qr_token}, ${`Mesa ${tableNumber}`})
  `;

  return NextResponse.json({ ok: true, table_number: tableNumber });
}

const patchSchema = z.object({
  table_number: z.number().int().positive(),
  max_photos: z.number().int().min(1).max(100).optional(),
  upload_paused: z.boolean().optional(),
}).refine((value) => value.max_photos !== undefined || value.upload_paused !== undefined, { message: "Nada para actualizar" });

const deleteSchema = z.object({ table_number: z.number().int().positive() });

export async function PATCH(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const event = await getAdminEvent();
  if (!event) return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const uploadWindow = getUploadWindowState(event);
  if (parsed.data.max_photos !== undefined && !uploadWindow.canEditSetup) {
    return NextResponse.json({ error: "Los cupos están bloqueados desde la apertura de la carga" }, { status: 409 });
  }

  const updated = (await sql`
    UPDATE table_qrs SET
      max_photos = COALESCE(${parsed.data.max_photos ?? null}, max_photos),
      upload_paused = COALESCE(${parsed.data.upload_paused ?? null}, upload_paused)
    WHERE table_number = ${parsed.data.table_number} AND event_id = ${event.id}
    RETURNING table_number, max_photos
  `) as { table_number: number; max_photos: number }[];

  if (!updated.length) {
    return NextResponse.json({ error: "Mesa no encontrada" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, table: updated[0] });
}

// Elimina una mesa solo si no tiene fotos (evita huérfanos en Cloudinary).
export async function DELETE(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const event = await getAdminEvent();
  if (!event) return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });
  if (!getUploadWindowState(event).canEditSetup) return NextResponse.json({ error: "Las familias y sus cupos están bloqueados desde la apertura de la carga" }, { status: 409 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const tables = (await sql`
    SELECT id FROM table_qrs WHERE table_number = ${parsed.data.table_number} AND event_id = ${event.id} LIMIT 1
  `) as { id: string }[];
  const table = tables[0];
  if (!table) {
    return NextResponse.json({ error: "Mesa no encontrada" }, { status: 404 });
  }

  const activity = (await sql`
    SELECT
      (SELECT count(*) FROM photos WHERE table_qr_id = ${table.id}) AS photos,
      (SELECT count(*) FROM upload_sessions WHERE table_qr_id = ${table.id}) AS sessions,
      (SELECT count(*) FROM guests WHERE table_qr_id = ${table.id} AND rsvp_responded_at IS NOT NULL) AS responded
  `) as { photos: string; sessions: string; responded: string }[];
  const counts = activity[0];
  if (Number(counts?.photos ?? 0) > 0 || Number(counts?.sessions ?? 0) > 0 || Number(counts?.responded ?? 0) > 0) {
    return NextResponse.json(
      { error: "La familia tiene actividad y no se puede eliminar; pausala para conservar sus datos" },
      { status: 409 },
    );
  }

  await sql`DELETE FROM guests WHERE table_qr_id = ${table.id} AND event_id = ${event.id}`;
  await sql`DELETE FROM table_qrs WHERE id = ${table.id} AND event_id = ${event.id}`;
  return NextResponse.json({ ok: true });
}
