import { NextResponse } from "next/server";
import { z } from "zod";
import { sql, type Event } from "@/lib/db";
import { isAdmin } from "@/lib/admin-auth";
import { broadcastSlideshow } from "@/lib/sse";

import { getAdminEvent } from "@/lib/event-context";

export const dynamic = "force-dynamic";

type EventSettings = Pick<
  Event,
  | "name"
  | "slug"
  | "reveal_at"
  | "upload_open"
  | "projection_enabled"
  | "slideshow_interval"
  | "max_photos_per_session"
>;

const eventSchema = z.object({
  slug: z.string().min(1).max(100),
  reveal_at: z.union([z.string().min(1), z.null()]).optional(),
  upload_open: z.boolean().optional(),
  projection_enabled: z.boolean().optional(),
  max_photos_per_session: z.number().int().min(1).max(100).optional(),
});

function unauthorized() {
  return NextResponse.json({ error: "No autorizado" }, { status: 401 });
}

function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

export async function GET(request: Request) {
  if (!(await isAdmin())) return unauthorized();

  const { searchParams } = new URL(request.url);
  const event = await getAdminEvent(searchParams.get("slug"));
  if (!event) return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });
  const rows = (await sql`
    SELECT name, slug, reveal_at, upload_open, projection_enabled,
           slideshow_interval, max_photos_per_session
    FROM events
    WHERE id = ${event.id}
    LIMIT 1
  `) as EventSettings[];

  if (!rows[0]) {
    return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ event: rows[0] });
}

export async function POST(request: Request) {
  if (!(await isAdmin())) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = eventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const event = await getAdminEvent(parsed.data.slug);
  if (!event) return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });

  let revealAt: string | null | undefined;
  if (parsed.data.reveal_at !== undefined) {
    if (parsed.data.reveal_at === null) {
      revealAt = null;
    } else {
      const revealDate = new Date(parsed.data.reveal_at);
      if (Number.isNaN(revealDate.getTime())) {
        return badRequest("Fecha de reveal inválida");
      }
      revealAt = revealDate.toISOString();
    }
  }

  if (
    revealAt === undefined &&
    parsed.data.upload_open === undefined &&
    parsed.data.projection_enabled === undefined &&
    parsed.data.max_photos_per_session === undefined
  ) {
    return badRequest("No hay cambios para guardar");
  }

  if (revealAt !== undefined) {
    await sql`UPDATE events SET reveal_at = ${revealAt} WHERE id = ${event.id}`;
  }
  if (parsed.data.upload_open !== undefined) {
    await sql`UPDATE events SET upload_open = ${parsed.data.upload_open} WHERE id = ${event.id}`;
  }
  if (parsed.data.max_photos_per_session !== undefined) {
    await sql`UPDATE events SET max_photos_per_session = ${parsed.data.max_photos_per_session} WHERE id = ${event.id}`;
  }
  if (
    parsed.data.projection_enabled !== undefined &&
    parsed.data.projection_enabled !== event.projection_enabled
  ) {
    await sql`UPDATE events SET projection_enabled = ${parsed.data.projection_enabled} WHERE id = ${event.id}`;
    broadcastSlideshow({
      action: "projection",
      enabled: parsed.data.projection_enabled,
    });
  }

  const updated = (await sql`
    SELECT name, slug, reveal_at, upload_open, projection_enabled,
           slideshow_interval, max_photos_per_session
    FROM events
    WHERE id = ${event.id}
    LIMIT 1
  `) as EventSettings[];

  return NextResponse.json({ ok: true, event: updated[0] });
}
