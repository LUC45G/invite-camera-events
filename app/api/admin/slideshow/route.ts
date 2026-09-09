import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";
import { isAdmin } from "@/lib/admin-auth";
import { broadcastSlideshow } from "@/lib/sse";

export const dynamic = "force-dynamic";

const controlSchema = z.object({
  action: z.enum(["pause", "resume", "next", "prev", "speed"]),
  value: z.number().int().min(2).max(60).optional(),
});

// Control del slideshow desde el panel admin.
export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = controlSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const { action, value } = parsed.data;

  if (action === "speed") {
    if (!value) {
      return NextResponse.json({ error: "Falta value" }, { status: 400 });
    }
    await sql`UPDATE events SET slideshow_interval = ${value}`;
    broadcastSlideshow({ action: "speed", value });
    return NextResponse.json({ ok: true, interval: value });
  }

  broadcastSlideshow({ action });
  return NextResponse.json({ ok: true });
}
