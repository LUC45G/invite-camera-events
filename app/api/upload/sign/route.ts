import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { env } from "@/lib/env";
import { signUpload } from "@/lib/cloudinary";
import {
  uploadAllowance,
  findSession,
  getEventById,
  touchSession,
  isTableUploadPaused,
  reserveUploadAuthorization,
  reserveTestUploadAuthorization,
  findTestRunById,
} from "@/lib/upload-db";
import { getUploadWindowState, uploadWindowError } from "@/lib/upload-window";

const signSchema = z.object({
  sessionToken: z.string().min(10).max(64),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = signSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const session = await findSession(parsed.data.sessionToken);
  if (!session) {
    return NextResponse.json({ error: "Sesión inválida" }, { status: 403 });
  }

  const event = await getEventById(session.event_id);
  if (!event) {
    return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });
  }
  if (!event.setup_complete || event.deletion_pending) {
    return NextResponse.json({ error: "El evento no está disponible para cargar fotos" }, { status: 423 });
  }
  const testRun = session.test_run_id ? await findTestRunById(session.test_run_id) : null;
  const testMode = Boolean(session.test_run_id);
  if (testMode && (!testRun || testRun.event_id !== event.id || testRun.status !== "active" || new Date(testRun.expires_at) <= new Date())) {
    return NextResponse.json({ error: "El QR de prueba venciÃ³ o ya fue utilizado" }, { status: 410 });
  }
  const uploadWindow = getUploadWindowState(event);
  if (!testMode && !uploadWindow.canStartNewUpload) return NextResponse.json(uploadWindowError(uploadWindow), { status: 423 });

  const allowance = await uploadAllowance(event, session);
  if (!allowance && !testMode) return NextResponse.json({ error: "Sesión inválida para este evento" }, { status: 403 });
  if (!testMode && session.table_qr_id && await isTableUploadPaused(session.table_qr_id, event.id)) {
    return NextResponse.json({ error: "La carga de esta familia está pausada" }, { status: 423 });
  }
  const { uploaded, limit } = testMode ? { uploaded: 0, limit: 1 } : allowance!;
  if (uploaded >= limit) {
    return NextResponse.json(
      { error: event.access_mode === "public_qr" ? "Alcanzaste el límite de fotos" : "Esta familia alcanzó el límite de fotos" },
      { status: 409 },
    );
  }

  await touchSession(session.id);

  const folder = testMode ? `weddings/${event.slug}/test/${session.test_run_id}` : `weddings/${event.slug}/${event.access_mode === "public_qr" ? "public" : "table"}`;
  const authorizationToken = randomBytes(32).toString("hex");
  const publicId = `upload-${authorizationToken}`;
  const { timestamp, signature, apiKey } = signUpload(folder, publicId);
  const reservation = testMode
    ? await reserveTestUploadAuthorization(event, session, publicId, timestamp, authorizationToken)
    : await reserveUploadAuthorization(event, session, publicId, timestamp, authorizationToken);
  if (!reservation) return NextResponse.json({ error: "Alcanzaste el lÃ­mite de fotos" }, { status: 409 });

  return NextResponse.json({
    timestamp,
    signature,
    apiKey,
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    folder,
    authorizationToken,
    publicId,
    remaining: reservation.limit - reservation.uploaded,
  });
}
