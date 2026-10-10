import { NextResponse } from "next/server";
import { z } from "zod";
import { findRsvp, saveRsvp, isTokenValid } from "@/lib/rsvp-db";

const rsvpSchema = z.object({
  token: z.string().min(10).max(64),
  name: z.string().min(1).max(100),
  status: z.enum(["accepted", "declined"]),
  guests: z.number().int().min(1).max(20),
  dietary: z.string().max(500).nullish(),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token") ?? "";
  if (!(await isTokenValid(token))) return NextResponse.json({ error: "Invitación inválida" }, { status: 403 });
  const existing = await findRsvp(token);
  return NextResponse.json({ responded: existing ?? null });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = rsvpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { token, name, status, guests, dietary } = parsed.data;
  if (!(await isTokenValid(token))) return NextResponse.json({ error: "Invitación inválida" }, { status: 403 });

  // saveRsvp falla si el token no existe o ya respondió (WHERE rsvp_status = 'pending')
  const saved = await saveRsvp({
    token,
    name,
    status,
    guests,
    dietary: dietary ?? null,
  });

  if (!saved) {
    return NextResponse.json(
      { error: "Token inválido o ya respondido" },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true });
}
