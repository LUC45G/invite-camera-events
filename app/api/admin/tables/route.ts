import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";
import { isAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

// Lista de mesas con sus tokens (solo admin). El cliente arma las URLs
// con su propio origin para que funcione en cualquier entorno.
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const rows = (await sql`
    SELECT t.table_number, t.qr_token, g.name AS guest_name
    FROM table_qrs t
    LEFT JOIN guests g ON g.table_qr_id = t.id
    ORDER BY t.table_number ASC
  `) as { table_number: number; qr_token: string; guest_name: string | null }[];

  return NextResponse.json({ tables: rows });
}

// Agrega una mesa nueva (número = máx + 1) con token corto + invitado.
export async function POST() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const events = (await sql`
    SELECT id FROM events LIMIT 1
  `) as { id: string }[];
  const event = events[0];
  if (!event) {
    return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });
  }

  const maxRows = (await sql`
    SELECT COALESCE(MAX(table_number), 0) AS max FROM table_qrs
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

const deleteSchema = z.object({ table_number: z.number().int().positive() });

// Elimina una mesa solo si no tiene fotos (evita huérfanos en Cloudinary).
export async function DELETE(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

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
    SELECT id FROM table_qrs WHERE table_number = ${parsed.data.table_number} LIMIT 1
  `) as { id: string }[];
  const table = tables[0];
  if (!table) {
    return NextResponse.json({ error: "Mesa no encontrada" }, { status: 404 });
  }

  const photos = (await sql`
    SELECT count(*) AS n FROM photos WHERE table_qr_id = ${table.id}
  `) as { n: string }[];
  if (Number(photos[0]?.n ?? 0) > 0) {
    return NextResponse.json(
      { error: "La mesa tiene fotos y no se puede eliminar" },
      { status: 409 },
    );
  }

  await sql`DELETE FROM guests WHERE table_qr_id = ${table.id}`;
  await sql`DELETE FROM table_qrs WHERE id = ${table.id}`;
  return NextResponse.json({ ok: true });
}
