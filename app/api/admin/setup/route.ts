import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { getInstallationEvent } from "@/lib/event-context";
import { sql } from "@/lib/db";
import { eventSchedule, retainedSetupSchema, newEventSetupSchema } from "@/lib/setup-policy";
import { weddingEvent } from "@/lib/event-data";
import { randomBytes } from "node:crypto";

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
  if (event.access_mode !== "invitations" && (result.data.invitation_message !== undefined || result.data.invitation_contact !== undefined)) {
    return NextResponse.json({error: "Este evento no usa invitaciones"}, {status: 400});
  }
  const schedule = eventSchedule(result.data.starts_at);
  const rows = await sql`
    UPDATE events SET starts_at = ${result.data.starts_at}, reveal_at = ${result.data.reveal_at},
      upload_starts_at = ${schedule.upload_starts_at}, upload_ends_at = ${schedule.upload_ends_at},
      invitation_message = COALESCE(${result.data.invitation_message ?? null}, invitation_message),
      invitation_contact = COALESCE(${result.data.invitation_contact ?? null}, invitation_contact),
      setup_complete = true
    WHERE id = ${event.id} AND setup_complete = false AND deletion_pending = false
    RETURNING id
  `;
  if (!rows.length) return NextResponse.json({ error: "La configuración ya cambió; recargá el panel" }, { status: 409 });
  return NextResponse.json({ ok: true });
}

export async function PUT(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (await getInstallationEvent()) {
    return NextResponse.json({ error: "Ya existe un evento. Recargá el panel para continuar." }, { status: 409 });
  }
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  const parsed = newEventSetupSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const data = parsed.data;
  const schedule = eventSchedule(data.starts_at);
  const publicToken = data.access_mode === "public_qr" ? randomBytes(32).toString("hex") : null;
  const invitationMessage = data.access_mode === "invitations" ? data.invitation_message : null;
  const invitationContact = data.access_mode === "invitations" ? data.invitation_contact : null;
  const families = (data.access_mode === "invitations" ? data.families : []).map((f, i) => ({
    number: i + 1, name: f.name, max_photos: f.max_photos, token: randomBytes(32).toString("hex"),
  }));
  // One statement: all records commit together, or none do. The installation
  // unique index arbitrates concurrent requests, even with different slugs.
  let rows: Record<string, unknown>[];
  try {
    rows = await sql`
    WITH created_event AS (
      INSERT INTO events (name, slug, access_mode, starts_at, reveal_at,
        upload_starts_at, upload_ends_at, max_photos_per_session, setup_complete, public_qr_token, invitation_message, invitation_contact)
      VALUES (${data.name}, ${weddingEvent.slug}, ${data.access_mode}, ${data.starts_at}, ${data.reveal_at},
        ${schedule.upload_starts_at}, ${schedule.upload_ends_at}, ${data.max_photos_per_session}, true, ${publicToken}, ${invitationMessage}, ${invitationContact})
      ON CONFLICT DO NOTHING RETURNING id, slug
    ), created_families AS (
      INSERT INTO table_qrs (event_id, table_number, qr_token, max_photos)
      SELECT e.id, f.number, f.token, f.max_photos FROM created_event e
      CROSS JOIN jsonb_to_recordset(${JSON.stringify(families)}::jsonb)
        AS f(number int, name text, max_photos int, token text)
      RETURNING id, event_id, table_number, qr_token
    ), created_guests AS (
      INSERT INTO guests (event_id, table_qr_id, token, name)
      SELECT t.event_id, t.id, t.qr_token, f.name FROM created_families t
      JOIN jsonb_to_recordset(${JSON.stringify(families)}::jsonb)
        AS f(number int, name text, max_photos int, token text) ON f.number = t.table_number
      RETURNING id
    ) SELECT id, slug, (SELECT count(*)::int FROM created_guests) AS families FROM created_event
    `;
  } catch {
    return NextResponse.json({ error: "No se pudo crear el evento. No se guardaron registros parciales; podés reintentar." }, { status: 500 });
  }
  if (!rows.length) return NextResponse.json({ error: "Otro intento ya creó el evento. Recargá el panel." }, { status: 409 });
  return NextResponse.json({ ok: true, event: rows[0] }, { status: 201 });
}
