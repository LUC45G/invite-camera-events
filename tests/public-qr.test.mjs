import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { state, request } from "./helpers/setup-environment.mjs";

const setup = await import("../app/api/admin/setup/route.ts");
const sessions = await import("../app/api/upload/session/route.ts");
const sign = await import("../app/api/upload/sign/route.ts");
const complete = await import("../app/api/upload/complete/route.ts");
const moderation = await import("../app/api/admin/photos/route.ts");
const photos = await import("../app/api/photos/route.ts");
const tables = await import("../app/api/admin/tables/route.ts");
const rsvp = await import("../app/api/rsvp/route.ts");
const exportPhotos = await import("../app/api/admin/export/route.ts");
const testUpload = await import("../app/api/admin/test-upload/route.ts");
const galleryPage = (await import("../app/[slug]/galeria/page.tsx")).default;
const invitationPage = (await import("../app/[slug]/page.tsx")).default;
const uploadPage = (await import("../app/[slug]/upload/page.tsx")).default;
const {CameraUploader} = await import("../components/CameraUploader.tsx");
const {AdminModeration} = await import("../components/AdminModeration.tsx");
const db = new PGlite();
const input = {name: "Internal name", starts_at: "2027-11-05T20:00:00-03:00", reveal_at: "2027-11-07T12:00:00-03:00", access_mode: "public_qr", max_photos_per_session: 24};
const migration = readFileSync(new URL("../db/migrations/003-public-upload-sessions.sql", import.meta.url), "utf8");
let event;
const openSession = (extra = {}) => sessions.POST(request({qr: event.public_qr_token, slug: event.slug, accessMode: "public_qr", ...extra}));
const authorize = async (sessionToken) => { const response = await sign.POST(request({sessionToken})); const data = await response.json(); return { response, data }; };

test.before(async () => {
  state.db = db;
  await db.exec(readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8").replace('CREATE EXTENSION IF NOT EXISTS "pgcrypto";', ""));
  for (const filename of ["001-event-setup.sql", "002-single-event-creation.sql", "003-public-upload-sessions.sql", "004-invitation-message-contact.sql", "005-family-pause.sql", "006-upload-authorizations.sql", "007-temporary-test-upload.sql", "008-event-deployment-registry.sql", "009-hostname-and-family-integrity.sql"]) {
    await db.exec(readFileSync(new URL(`../db/migrations/${filename}`, import.meta.url), "utf8"));
  }
});
test.beforeEach(async () => {
  await db.exec("TRUNCATE events CASCADE"); state.admin = true; state.serverScore = null; state.resourceError = null; state.broadcasts = [];
  assert.equal((await setup.PUT(request(input))).status, 201);
  event = (await db.query("SELECT * FROM events")).rows[0];
  await db.exec("UPDATE events SET upload_starts_at = now() - interval '1 minute', upload_ends_at = now() + interval '1 hour'");
});
test.after(async () => { await db.close(); });

test("crea un QR público persistente sin familias ni invitados, migración repetible", async () => {
  assert.match(event.public_qr_token, /^[a-f0-9]{64}$/);
  assert.equal((await db.query("SELECT count(*)::int AS n FROM table_qrs")).rows[0].n, 0);
  assert.equal((await db.query("SELECT count(*)::int AS n FROM guests")).rows[0].n, 0);
  assert.equal((await setup.PUT(request(input))).status, 409);
  await db.exec(migration);
  assert.equal((await db.query("SELECT public_qr_token FROM events")).rows[0].public_qr_token, event.public_qr_token);
  assert.equal((await tables.POST()).status, 404);
  assert.equal((await rsvp.POST(request({token: event.public_qr_token, name: "No RSVP", status: "accepted", guests: 1}))).status, 403);
});

test("dos navegadores obtienen sesiones independientes y reanudan sin confirmar ni RSVP", async () => {
  const first = await (await openSession()).json();
  const second = await (await openSession()).json();
  assert.notEqual(first.sessionToken, second.sessionToken);
  assert.equal(first.remaining, 24); assert.equal(first.confirm, undefined); assert.equal(first.tableNumber, undefined);
  assert.equal((await (await openSession({sessionToken: first.sessionToken})).json()).sessionToken, first.sessionToken);
  const rows = (await db.query("SELECT * FROM upload_sessions")).rows;
  assert.equal(rows.length, 2); assert.ok(rows.every(s => s.table_qr_id === null && s.access_mode === "public_qr"));
});

test("tokens, slugs y sesiones de otros modos o eventos no se mezclan", async () => {
  assert.equal((await sessions.POST(request({qr: event.public_qr_token}))).status, 403);
  assert.equal((await openSession({slug: "other"})).status, 403);
  assert.equal((await openSession({qr: "invalid-token"})).status, 403);
  await db.query("INSERT INTO table_qrs (event_id, table_number, qr_token) VALUES ($1, 1, 'family-token')", [event.id]);
  const family = (await db.query("SELECT id FROM table_qrs")).rows[0];
  await db.query("INSERT INTO upload_sessions (event_id, table_qr_id, session_token) VALUES ($1, $2, 'family-session')", [event.id, family.id]);
  assert.equal((await openSession({qr: "family-token"})).status, 403);
  assert.equal((await sessions.POST(request({qr: "family-token"}))).status, 403);
  assert.equal((await openSession({sessionToken: "family-session"})).status, 409);
  assert.equal((await sign.POST(request({sessionToken: "family-session"}))).status, 403);
  assert.equal((await complete.POST(request({sessionToken: "family-session", authorizationToken: "fake-authorization-token", publicId: "wrong"}))).status, 403);
  // A session predating an installation reset must not resume in the new event.
  await db.exec("ALTER TABLE upload_sessions DROP CONSTRAINT upload_sessions_event_id_fkey");
  try {
    await db.query("INSERT INTO upload_sessions (event_id, session_token, access_mode) VALUES ($1, 'other-event-session', 'public_qr')", ["00000000-0000-4000-8000-000000000001"]);
    assert.equal((await openSession({sessionToken: "other-event-session"})).status, 409);
    await db.exec("DELETE FROM upload_sessions WHERE session_token = 'other-event-session'");
  } finally {
    await db.exec("ALTER TABLE upload_sessions ADD CONSTRAINT upload_sessions_event_id_fkey FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE");
  }
});

test("el consumo público es por sesión, persiste al moderar/borrar y no supera el cupo concurrentemente", async () => {
  await db.exec("UPDATE events SET max_photos_per_session = 1");
  const first = await (await openSession()).json(); const second = await (await openSession()).json();
  const firstAuthorization = await authorize(first.sessionToken);
  assert.equal(firstAuthorization.response.status, 200);
  assert.equal((await sign.POST(request({sessionToken: first.sessionToken}))).status, 409);
  assert.equal((await complete.POST(request({sessionToken: first.sessionToken, authorizationToken: firstAuthorization.data.authorizationToken, publicId: firstAuthorization.data.publicId}))).status, 200);
  assert.equal((await complete.POST(request({sessionToken: first.sessionToken, authorizationToken: firstAuthorization.data.authorizationToken, publicId: firstAuthorization.data.publicId}))).status, 200);
  assert.equal((await sign.POST(request({sessionToken: first.sessionToken}))).status, 409);
  const secondAuthorization = await authorize(second.sessionToken);
  assert.equal(secondAuthorization.response.status, 200);
  assert.equal((await complete.POST(request({sessionToken: second.sessionToken, authorizationToken: secondAuthorization.data.authorizationToken, publicId: secondAuthorization.data.publicId}))).status, 200);
  assert.equal((await db.query("SELECT count(*)::int AS n FROM photos WHERE event_id = $1 AND table_qr_id IS NULL", [event.id])).rows[0].n, 2);
  await db.exec("DELETE FROM photos");
  assert.equal((await (await openSession({sessionToken: first.sessionToken})).json()).remaining, 0);
});

test("las fotos públicas conservan moderación, proyección, galería y exportación", async () => {
  const first = await (await openSession()).json();
  const authorization = await authorize(first.sessionToken);
  const response = await complete.POST(request({sessionToken: first.sessionToken, authorizationToken: authorization.data.authorizationToken, publicId: authorization.data.publicId}));
  const {id} = await response.json();
  assert.equal((await complete.POST(request({sessionToken: first.sessionToken, authorizationToken: authorization.data.authorizationToken, publicId: authorization.data.publicId}))).status, 200);
  assert.equal((await db.query("SELECT photo_count FROM upload_sessions")).rows[0].photo_count, 1);
  const pending = await (await moderation.GET(new Request(`http://local/api?slug=${event.slug}`))).json();
  assert.equal(pending.photos[0].status, "pending");
  assert.equal((await moderation.POST(request({id, action: "approve"}))).status, 200);
  const live = await (await photos.GET(new Request(`http://local/api?slug=${event.slug}&mode=live`))).json();
  assert.equal(live.photos.length, 1);
  await db.exec("UPDATE events SET reveal_at = now() - interval '1 second'");
  const gallery = await (await photos.GET(new Request(`http://local/api?slug=${event.slug}`))).json();
  assert.equal(gallery.photos.length, 1);
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(new Uint8Array([1,2,3]), {status: 200});
  try {
    const zip = await exportPhotos.GET(new Request(`http://local/api?slug=${event.slug}`));
    assert.equal(zip.status, 200); assert.equal(zip.headers.get("content-type"), "application/zip");
    assert.ok((await zip.arrayBuffer()).byteLength > 0);
  } finally { globalThis.fetch = previousFetch; }
});

test("pausa y setup pendiente bloquean nuevas sesiones públicas", async () => {
  await db.exec("UPDATE events SET upload_open = false");
  assert.equal((await openSession()).status, 423);
  await db.exec("UPDATE events SET upload_open = true, setup_complete = false");
  assert.equal((await openSession()).status, 423);
  assert.equal((await db.query("SELECT count(*)::int AS n FROM upload_sessions")).rows[0].n, 0);
});

test("ruta principal pública responde 404 y render de carga/admin omite invitaciones y familias", async () => {
  await assert.rejects(invitationPage({params: Promise.resolve({slug: event.slug}), searchParams: Promise.resolve({})}), /TEST_NOT_FOUND/);
  const entry = await uploadPage({params: Promise.resolve({slug: event.slug}), searchParams: Promise.resolve({qr: event.public_qr_token})});
  assert.equal(entry.props.accessMode, "public_qr");
  const camera = renderToStaticMarkup(createElement(CameraUploader, {slug: event.slug, qr: event.public_qr_token, accessMode: "public_qr"}));
  assert.doesNotMatch(camera, /Invitación|Vincularse|Familia/);
  const panel = renderToStaticMarkup(createElement(AdminModeration, {slug: event.slug, eventName: event.name, accessMode: "public_qr", publicToken: event.public_qr_token, sessionLimit: 24}));
  assert.match(panel, /QR único/); assert.doesNotMatch(panel, /QRs e invitaciones|Confirmaciones de asistencia/);
});

test("una autorización previa puede finalizar después del cierre y la pausa", async () => {
  const first = await (await openSession()).json();
  const authorization = await authorize(first.sessionToken);
  assert.equal((await complete.POST(request({sessionToken: first.sessionToken, authorizationToken: authorization.data.authorizationToken, publicId: "recurso-manipulado"}))).status, 409);
  await db.exec("UPDATE events SET upload_open = false, upload_ends_at = now() - interval '1 second'");
  assert.equal((await complete.POST(request({sessionToken: first.sessionToken, authorizationToken: authorization.data.authorizationToken, publicId: authorization.data.publicId}))).status, 200);
});

test("una reserva vencida libera el cupo para reintentar", async () => {
  await db.exec("UPDATE events SET max_photos_per_session = 1");
  const first = await (await openSession()).json();
  const authorization = await authorize(first.sessionToken);
  assert.equal(authorization.response.status, 200);
  await db.exec("UPDATE upload_authorizations SET expires_at = now() - interval '1 second'");
  const retry = await authorize(first.sessionToken);
  assert.equal(retry.response.status, 200);
});

test("a revealed gallery keeps approved photos when another photo is pending", async () => {
  const first = await (await openSession()).json();
  const firstAuthorization = await authorize(first.sessionToken);
  const firstPhoto = await complete.POST(request({sessionToken: first.sessionToken, authorizationToken: firstAuthorization.data.authorizationToken, publicId: firstAuthorization.data.publicId}));
  const firstData = await firstPhoto.json();
  await moderation.POST(request({id: firstData.id, action: "approve"}));

  const second = await (await openSession()).json();
  const secondAuthorization = await authorize(second.sessionToken);
  await complete.POST(request({sessionToken: second.sessionToken, authorizationToken: secondAuthorization.data.authorizationToken, publicId: secondAuthorization.data.publicId}));
  await db.exec("UPDATE events SET reveal_at = now() - interval '1 second'");

  const rendered = await galleryPage({params: Promise.resolve({slug: event.slug})});
  assert.match(JSON.stringify(rendered), /cloudinary_url/);
});

test("temporary QR isolates one upload, applies the NSFW threshold, and cleans up", async () => {
  await db.exec("UPDATE events SET upload_starts_at = now() - interval '2 days', upload_ends_at = now() - interval '1 day'");
  const created = await testUpload.POST(request({slug: event.slug, action: "create"}));
  assert.equal(created.status, 200);
  const run = (await created.json()).run;

  const entry = await sessions.POST(request({qr: run.token, slug: event.slug, accessMode: "public_qr"}));
  assert.equal(entry.status, 200);
  const sessionData = await entry.json();
  const authorization = await sign.POST(request({sessionToken: sessionData.sessionToken}));
  const authorizationData = await authorization.json();
  assert.equal(authorization.status, 200, JSON.stringify(authorizationData));
  state.serverScore = 0.69;
  const completed = await complete.POST(request({sessionToken: sessionData.sessionToken, authorizationToken: authorizationData.authorizationToken, publicId: authorizationData.publicId, nsfwScore: 0.69}));
  assert.equal(completed.status, 200);

  const live = await (await photos.GET(new Request(`http://local/api?slug=${event.slug}&mode=live`))).json();
  assert.equal(live.photos.length, 0);
  const testPhotos = await (await testUpload.GET(new Request(`http://local/api?slug=${event.slug}`))).json();
  assert.equal(testPhotos.photos.length, 1);
  assert.equal(testPhotos.photos[0].status, "approved");
  assert.equal((await sign.POST(request({sessionToken: sessionData.sessionToken}))).status, 410);

  state.cloudResult = new Error("cloudinary unavailable");
  const failedCleanup = await testUpload.POST(request({slug: event.slug, action: "cleanup", runId: run.id}));
  assert.equal(failedCleanup.status, 502);
  state.cloudResult = null;
  assert.equal((await testUpload.POST(request({slug: event.slug, action: "cleanup", runId: run.id}))).status, 200);
  assert.equal((await (await testUpload.GET(new Request(`http://local/api?slug=${event.slug}`))).json()).run, null);

  const thresholdRun = (await (await testUpload.POST(request({slug: event.slug, action: "create"}))).json()).run;
  const thresholdSession = await (await sessions.POST(request({qr: thresholdRun.token, slug: event.slug, accessMode: "public_qr"}))).json();
  const thresholdAuthorization = await (await sign.POST(request({sessionToken: thresholdSession.sessionToken}))).json();
  state.serverScore = 0.7;
  await complete.POST(request({sessionToken: thresholdSession.sessionToken, authorizationToken: thresholdAuthorization.authorizationToken, publicId: thresholdAuthorization.publicId, nsfwScore: 0.7}));
  const thresholdPhotos = await (await testUpload.GET(new Request(`http://local/api?slug=${event.slug}`))).json();
  assert.equal(thresholdPhotos.photos[0].status, "pending");
  assert.equal((await testUpload.POST(request({slug: event.slug, action: "cleanup", runId: thresholdRun.id}))).status, 200);
});
