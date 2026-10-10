import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { state, request } from "./helpers/setup-environment.mjs";
const { eventSchedule } = await import("../lib/setup-policy.ts");

const setup = await import("../app/api/admin/setup/route.ts");
const wipe = await import("../app/api/admin/wipe/route.ts");
const session = await import("../app/api/upload/session/route.ts");
const db = new PGlite();
const migration = readFileSync(new URL("../db/migrations/001-event-setup.sql", import.meta.url), "utf8");
const validSettings = { starts_at: "2027-11-05T19:30:00-03:00", reveal_at: "2027-11-07T12:00:00-03:00" };
let eventId;

test.before(async () => {
  state.db = db;
  const schema = readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8").replace('CREATE EXTENSION IF NOT EXISTS "pgcrypto";', "");
  await db.exec(schema);
  await db.exec(migration);
  await db.exec(readFileSync(new URL("../db/migrations/003-public-upload-sessions.sql", import.meta.url), "utf8"));
  await db.exec(readFileSync(new URL("../db/migrations/004-invitation-message-contact.sql", import.meta.url), "utf8"));
});
test.beforeEach(async () => {
  await db.exec("TRUNCATE events CASCADE");
  state.admin = true; state.queries = []; state.cloudCalls = []; state.cloudResult = null;
  const event = await db.query("INSERT INTO events(name, slug, max_photos_per_session) VALUES('Legacy wedding', 'custom-slug', 30) RETURNING id");
  eventId = event.rows[0].id;
  const family = await db.query("INSERT INTO table_qrs(event_id, table_number, qr_token, max_photos) VALUES($1, 1, 'legacy-token-1', 35) RETURNING id", [eventId]);
  const familyId = family.rows[0].id;
  await db.query("INSERT INTO guests(event_id, table_qr_id, token, name, rsvp_status) VALUES($1, $2, 'legacy-token-1', 'Family', 'accepted')", [eventId, familyId]);
  const upload = await db.query("INSERT INTO upload_sessions(event_id, table_qr_id, session_token, photo_count) VALUES($1, $2, 'legacy-session', 7) RETURNING id", [eventId, familyId]);
  await db.query("INSERT INTO photos(event_id, table_qr_id, upload_session_id, cloudinary_public_id, cloudinary_url, thumbnail_url, status) VALUES($1, $2, $3, 'legacy-photo', 'https://test/full', 'https://test/thumb', 'approved')", [eventId, familyId, upload.rows[0].id]);
});
test.after(async () => { await db.close(); });

test("migración repetida conserva tokens/RSVP y reconstruye consumo sin duplicarlo", async () => {
  await db.exec(migration); await db.exec(migration);
  const families = (await db.query("SELECT qr_token, max_photos, photo_count FROM table_qrs")).rows;
  assert.deepEqual(families, [{qr_token: "legacy-token-1", max_photos: 35, photo_count: 7}]);
  assert.equal((await db.query("SELECT rsvp_status FROM guests")).rows[0].rsvp_status, "accepted");
  assert.equal((await db.query("SELECT setup_complete FROM events")).rows[0].setup_complete, false);
});

test("la cámara permanece bloqueada antes de confirmar el setup", async () => {
  const response = await session.POST(request({qr: "legacy-token-1", confirmed: true}));
  assert.equal(response.status, 423);
  assert.equal((await db.query("SELECT count(*)::int AS n FROM upload_sessions")).rows[0].n, 1);
});

test("conservar configura horarios sin cambiar identidades ni cupos", async () => {
  const before = (await db.query("SELECT id, qr_token, max_photos FROM table_qrs")).rows;
  const response = await setup.POST(request(validSettings));
  assert.equal(response.status, 200);
  assert.deepEqual((await db.query("SELECT id, qr_token, max_photos FROM table_qrs")).rows, before);
  const event = (await db.query("SELECT * FROM events")).rows[0];
  assert.equal(event.id, eventId);
  assert.equal(event.access_mode, "invitations");
  assert.equal(event.setup_complete, true);
  assert.equal(new Date(event.upload_ends_at).toISOString(), "2027-11-06T15:00:00.000Z");
  assert.equal((await setup.POST(request(validSettings))).status, 409);
});

test("reveal temprano y cambio de modalidad no alteran el evento", async () => {
  assert.equal((await setup.POST(request({...validSettings, reveal_at: "2027-11-06T12:00:00-03:00"}))).status, 400);
  assert.equal((await setup.POST(request({...validSettings, access_mode: "public_qr"}))).status, 400);
  assert.equal((await db.query("SELECT setup_complete FROM events")).rows[0].setup_complete, false);
});

test("borrar exige admin, confirmación exacta y el evento correcto", async () => {
  state.admin = false;
  assert.equal((await wipe.POST(request({slug: "custom-slug", confirmation: "BORRAR TODO"}))).status, 401);
  state.admin = true;
  assert.equal((await wipe.POST(request({slug: "custom-slug", confirmation: "borrar"}))).status, 400);
  assert.equal((await wipe.POST(request({slug: "other", confirmation: "BORRAR TODO"}))).status, 404);
  assert.equal(state.cloudCalls.length, 0);
  assert.equal((await db.query("SELECT count(*)::int AS n FROM events")).rows[0].n, 1);
});

test("Cloudinary incompleto conserva referencias y bloquea carga hasta reintentar", async () => {
  state.cloudResult = {deleted: {}};
  const response = await wipe.POST(request({slug: "custom-slug", confirmation: "BORRAR TODO"}));
  assert.equal(response.status, 502);
  assert.equal((await db.query("SELECT deletion_pending FROM events")).rows[0].deletion_pending, true);
  assert.equal((await db.query("SELECT count(*)::int AS n FROM photos")).rows[0].n, 1);
  assert.equal((await setup.POST(request(validSettings))).status, 409);
  state.cloudResult = {deleted: {"legacy-photo": "not_found"}};
  assert.equal((await wipe.POST(request({slug: "custom-slug", confirmation: "BORRAR TODO"}))).status, 200);
  assert.equal((await db.query("SELECT count(*)::int AS n FROM events")).rows[0].n, 0);
  assert.equal((await db.query("SELECT count(*)::int AS n FROM photos")).rows[0].n, 0);
});

test("Cloudinary caído no pierde los recursos para un próximo intento", async () => {
  state.cloudResult = new Error("offline");
  assert.equal((await wipe.POST(request({slug: "custom-slug", confirmation: "BORRAR TODO"}))).status, 502);
  assert.equal((await db.query("SELECT cloudinary_public_id FROM photos")).rows[0].cloudinary_public_id, "legacy-photo");
});

test("la ventana usa el día argentino incluso para timestamps UTC", () => {
  assert.deepEqual(eventSchedule("2027-11-06T01:00:00Z"), {
    upload_starts_at: "2027-11-05T15:00:00.000Z", upload_ends_at: "2027-11-06T15:00:00.000Z", min_reveal_at: "2027-11-07T15:00:00.000Z",
  });
});
