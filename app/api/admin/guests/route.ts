import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";
import { isAdmin } from "@/lib/admin-auth";

import { getAdminEvent } from "@/lib/event-context";

export const dynamic = "force-dynamic";

const renameSchema = z.object({
  table_number: z.number().int().positive(),
  name: z.string().trim().min(1).max(100).optional(),
  status: z.enum(["pending", "accepted", "declined"]).optional(),
}).refine((d) => d.name !== undefined || d.status !== undefined, {
  message: "Nada para actualizar",
});

// Renombra la familia/invitación de una mesa y/o cambia su estado RSVP
// (para rehabilitar el QR si el invitado cambia de decisión).
export async function POST(request: Request) {
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

  const parsed = renameSchema.safeParse(body);
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

  const { name, status } = parsed.data;

  if (name !== undefined) {
    await sql`
      UPDATE guests SET name = ${name} WHERE table_qr_id = ${table.id} AND event_id = ${event.id}
    `;
  }
  if (status !== undefined) {
    await sql`
      UPDATE guests
      SET rsvp_status = ${status},
          rsvp_responded_at = ${status === "pending" ? null : new Date().toISOString()}
      WHERE table_qr_id = ${table.id} AND event_id = ${event.id}
    `;
  }
  return NextResponse.json({ ok: true });
}
