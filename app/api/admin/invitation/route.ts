import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { getAdminInvitationEvent } from "@/lib/event-context";
import { sql } from "@/lib/db";
import { DEFAULT_INVITATION_MESSAGE, DEFAULT_INVITATION_CONTACT, invitationSettingsSchema } from "@/lib/invitation-message";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({error: "No autorizado"}, {status: 401});
  const event = await getAdminInvitationEvent();
  if (!event) return NextResponse.json({error: "Invitaciones no disponibles"}, {status: 404});
  return NextResponse.json({invitation_message: event.invitation_message ?? DEFAULT_INVITATION_MESSAGE, invitation_contact: event.invitation_contact ?? DEFAULT_INVITATION_CONTACT});
}

export async function PUT(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({error: "No autorizado"}, {status: 401});
  const event = await getAdminInvitationEvent();
  if (!event) return NextResponse.json({error: "Invitaciones no disponibles"}, {status: 404});
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({error: "Datos inválidos"}, {status: 400}); }
  const parsed = invitationSettingsSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({error: parsed.error.issues[0].message}, {status: 400});
  const [updated] = await sql`
    UPDATE events SET invitation_message = ${parsed.data.invitation_message}, invitation_contact = ${parsed.data.invitation_contact}
    WHERE id = ${event.id} AND access_mode = 'invitations' AND setup_complete = true AND deletion_pending = false
    RETURNING invitation_message, invitation_contact
  `;
  if (!updated) return NextResponse.json({error: "El evento cambió. Recargá el panel."}, {status: 409});
  return NextResponse.json(updated);
}
