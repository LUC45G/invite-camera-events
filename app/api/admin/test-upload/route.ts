import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";
import { isAdmin } from "@/lib/admin-auth";
import { cloudinary } from "@/lib/cloudinary";
import { getAdminEvent } from "@/lib/event-context";
import { createTestRun } from "@/lib/upload-db";

export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ error: "No autorizado" }, { status: 401 });
}

export async function GET(request: Request) {
  if (!(await isAdmin())) return unauthorized();
  const { searchParams } = new URL(request.url);
  const event = await getAdminEvent(searchParams.get("slug"));
  if (!event) return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });

  await sql`UPDATE upload_test_runs SET status = 'cleanup_pending' WHERE event_id = ${event.id} AND status = 'active' AND expires_at <= now()`;
  const runs = await sql`
    SELECT id, token, status, expires_at, created_at, completed_at
    FROM upload_test_runs
    WHERE event_id = ${event.id}
    ORDER BY created_at DESC
    LIMIT 1`;
  const run = runs[0] as { id: string; token: string; status: string; expires_at: string; created_at: string; completed_at: string | null } | undefined;
  if (!run) return NextResponse.json({ run: null, photos: [] });
  const photos = await sql`
    SELECT id, cloudinary_url, thumbnail_url, status, nsfw_score, created_at
    FROM photos
    WHERE event_id = ${event.id} AND test_run_id = ${run.id}
    ORDER BY created_at ASC`;
  return NextResponse.json({ run, photos });
}

const actionSchema = z.object({
  slug: z.string().min(1),
  action: z.enum(["create", "cancel", "cleanup"]),
  runId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  if (!(await isAdmin())) return unauthorized();
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Datos invÃ¡lidos" }, { status: 400 });
  const event = await getAdminEvent(parsed.data.slug);
  if (!event) return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });

  if (parsed.data.action === "create") {
    const active = await sql`
      SELECT id FROM upload_test_runs
      WHERE event_id = ${event.id} AND status = 'active' AND expires_at > now()
      LIMIT 1`;
    if (active.length) return NextResponse.json({ error: "Ya hay una prueba activa" }, { status: 409 });
    const run = await createTestRun(event.id);
    return NextResponse.json({ ok: true, run });
  }

  if (!parsed.data.runId) return NextResponse.json({ error: "Falta runId" }, { status: 400 });
  const rows = await sql`SELECT * FROM upload_test_runs WHERE id = ${parsed.data.runId} AND event_id = ${event.id} LIMIT 1`;
  const run = rows[0] as { id: string; status: string } | undefined;
  if (!run) return NextResponse.json({ error: "Prueba no encontrada" }, { status: 404 });

  if (parsed.data.action === "cancel") {
    const resources = await sql`
      SELECT 1 FROM photos WHERE test_run_id = ${run.id}
      UNION ALL
      SELECT 1 FROM upload_authorizations WHERE test_run_id = ${run.id} AND status = 'reserved'
      LIMIT 1`;
    await sql`UPDATE upload_test_runs SET status = ${resources.length ? "cleanup_pending" : "cancelled"} WHERE id = ${run.id}`;
    return NextResponse.json({ ok: true });
  }

  const photos = await sql`SELECT cloudinary_public_id FROM photos WHERE test_run_id = ${run.id}`;
  const authorizations = await sql`
    SELECT public_id FROM upload_authorizations
    WHERE test_run_id = ${run.id} AND status = 'reserved'`;
  const resources = [...photos, ...authorizations].map((p) => String(p.cloudinary_public_id ?? p.public_id));
  try {
    if (resources.length) await cloudinary.api.delete_resources([...new Set(resources)], { resource_type: "image", type: "upload", invalidate: true });
  } catch {
    await sql`UPDATE upload_test_runs SET status = 'cleanup_pending' WHERE id = ${run.id}`;
    return NextResponse.json({ error: "No se pudieron borrar todos los recursos. La prueba queda disponible para reintentar." }, { status: 502 });
  }
  await sql`DELETE FROM upload_test_runs WHERE id = ${run.id}`;
  return NextResponse.json({ ok: true, cleaned: true });
}
