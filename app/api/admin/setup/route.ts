import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { getInstallationEvent } from "@/lib/event-context";
import { sql } from "@/lib/db";
import { eventSchedule, retainedSetupSchema } from "@/lib/setup-policy";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const event = await getInstallationEvent();
  if (!event || event.setup_complete || event.deletion_pending) {
    return NextResponse.json({ error: "No hay una configuración pendiente disponible" }, { status: 409 });
  }
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  const result = retainedSetupSchema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
  const schedule = eventSchedule(result.data.starts_at);
  const rows = await sql`
    UPDATE events SET starts_at = ${result.data.starts_at}, reveal_at = ${result.data.reveal_at},
      upload_starts_at = ${schedule.upload_starts_at}, upload_ends_at = ${schedule.upload_ends_at},
      setup_complete = true
    WHERE id = ${event.id} AND setup_complete = false AND deletion_pending = false
    RETURNING id
  `;
  if (!rows.length) return NextResponse.json({ error: "La configuración ya cambió; recargá el panel" }, { status: 409 });
  return NextResponse.json({ ok: true });
}
