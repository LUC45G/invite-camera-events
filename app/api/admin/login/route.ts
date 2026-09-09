import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import {
  clearSessionCookie,
  isAdmin,
  setSessionCookie,
} from "@/lib/admin-auth";

const loginSchema = z.object({ password: z.string().min(1) });

export async function GET() {
  return NextResponse.json({ admin: await isAdmin() });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  if (parsed.data.password !== env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 403 });
  }

  await setSessionCookie();
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
