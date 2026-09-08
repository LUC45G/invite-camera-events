import { NextResponse } from "next/server";
import { z } from "zod";
import { findRsvp, isTokenValid, saveRsvp } from "@/lib/rsvp-store";

const rsvpSchema = z.object({
  token: z.string().min(1),
  name: z.string().min(1),
  status: z.enum(["accepted", "declined"]),
  guests: z.number().int().min(1).max(20),
  dietary: z.string().max(500).nullish(),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token") ?? "";
  const existing = findRsvp(token);
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

  if (!isTokenValid(token)) {
    return NextResponse.json({ error: "Token inválido" }, { status: 403 });
  }

  // Un solo RSVP por token: si ya respondió, no se puede volver a responder.
  if (findRsvp(token)) {
    return NextResponse.json(
      { error: "Ya confirmaste tu asistencia" },
      { status: 409 },
    );
  }

  saveRsvp({
    token,
    name,
    status,
    guests,
    dietary: dietary ?? null,
    respondedAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}
