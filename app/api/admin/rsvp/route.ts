import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { isAdmin } from "@/lib/admin-auth";

import { getAdminInvitationEvent as getAdminEvent } from "@/lib/event-context";

export const dynamic = "force-dynamic";

type AdminGuestRow = {
  table_number: number | null;
  name: string | null;
  rsvp_status: string;
  rsvp_guests: number;
  rsvp_dietary: string | null;
  rsvp_responded_at: string | null;
};

function unauthorized() {
  return NextResponse.json({ error: "No autorizado" }, { status: 401 });
}

export async function GET(request: Request) {
  if (!(await isAdmin())) return unauthorized();

  const { searchParams } = new URL(request.url);
  const event = await getAdminEvent(searchParams.get("slug"));
  if (!event) return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });

  const guests = (await sql`
    SELECT t.table_number, g.name, g.rsvp_status, g.rsvp_guests,
           g.rsvp_dietary, g.rsvp_responded_at
    FROM guests g
    JOIN events e ON e.id = g.event_id
    LEFT JOIN table_qrs t ON t.id = g.table_qr_id
    WHERE e.id = ${event.id}
    ORDER BY t.table_number ASC, g.name ASC
  `) as AdminGuestRow[];

  const summary = {
    total: guests.length,
    pending: guests.filter((g) => g.rsvp_status === "pending").length,
    accepted: guests.filter((g) => g.rsvp_status === "accepted").length,
    declined: guests.filter((g) => g.rsvp_status === "declined").length,
    confirmedPeople: guests
      .filter((g) => g.rsvp_status === "accepted")
      .reduce((total, g) => total + Number(g.rsvp_guests ?? 0), 0),
    dietary: [
      ...new Set(
        guests
          .filter((g) => g.rsvp_status === "accepted" && g.rsvp_dietary?.trim())
          .map((g) => String(g.rsvp_dietary).trim()),
      ),
    ].sort((a, b) => a.localeCompare(b, "es")),
  };

  return NextResponse.json({ summary, guests });
}
