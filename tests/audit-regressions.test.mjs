import assert from "node:assert/strict";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { state, request } from "./helpers/setup-environment.mjs";
import { applyMigrations } from "../scripts/migration-utils.mts";
import { fetchPhotoPages } from "../lib/photo-pages.ts";

const setup = await import("../app/api/admin/setup/route.ts");
const sessions = await import("../app/api/upload/session/route.ts");
const signing = await import("../app/api/upload/sign/route.ts");
const completing = await import("../app/api/upload/complete/route.ts");
const testing = await import("../app/api/admin/test-upload/route.ts");
const photos = await import("../app/api/photos/route.ts");
const adminPhotos = await import("../app/api/admin/photos/route.ts");
const tables = await import("../app/api/admin/tables/route.ts");
const rsvp = await import("../app/api/rsvp/route.ts");
const exporting = await import("../app/api/admin/export/route.ts");
const wipe = await import("../app/api/admin/wipe/route.ts");
const { getInstallationEvent } = await import("../lib/event-context.ts");
const { uploadAllowance } = await import("../lib/upload-db.ts");
const gallery = (await import("../app/[slug]/galeria/page.tsx")).default;
const db = new PGlite();
const identity = { EVENT_SLUG: "nuestra-boda", DEPLOYMENT_ID: "local", EVENT_HOSTNAME: "localhost" };
const input = { name: "Audit", starts_at: "2027-11-05T20:00:00-03:00", reveal_at: "2027-11-07T12:00:00-03:00", access_mode: "public_qr", max_photos_per_session: 24 };
let event;
const migrate = () => applyMigrations((statements) => db.transaction(async (tx) => {
  for (const statement of statements) if (!statement.includes('CREATE EXTENSION IF NOT EXISTS "pgcrypto"')) await tx.exec(statement);
}));
const open = async () => (await sessions.POST(request({ qr: event.public_qr_token, slug: event.slug, accessMode: "public_qr" }))).json();
const authorize = async (session) => (await signing.POST(request({ sessionToken: session.sessionToken }))).json();
const complete = (session, auth, extra = {}) => completing.POST(request({ sessionToken: session.sessionToken, authorizationToken: auth.authorizationToken, publicId: auth.publicId, ...extra }));

test.before(async () => { state.db = db; await migrate(); });
test.beforeEach(async () => {
  await db.exec("TRUNCATE events CASCADE");
  Object.assign(state.installation, identity);
  state.admin = true; state.cloudCalls = []; state.cloudResult = null; state.resourceError = null; state.serverScore = null; state.broadcasts = [];
  assert.equal((await setup.PUT(request(input))).status, 201);
  event = (await db.query("SELECT * FROM events")).rows[0];
  await db.exec("UPDATE events SET upload_starts_at = now() - interval '1 minute', upload_ends_at = now() + interval '1 hour'");
});
test.after(async () => { await db.close(); });

test("two clones share a database without sharing setup, public sessions or wipe", async () => {
  Object.assign(state.installation, { EVENT_SLUG: "event-b", DEPLOYMENT_ID: "clone-b", EVENT_HOSTNAME: "b.example.com" });
  assert.equal(await getInstallationEvent(), null);
  assert.equal((await setup.PUT(request({ ...input, name: "Second" }))).status, 201);
  const other = await getInstallationEvent();
  await db.exec("UPDATE events SET upload_starts_at=now()-interval '1 minute', upload_ends_at=now()+interval '1 hour'");
  assert.equal((await sessions.POST(request({ qr: event.public_qr_token, slug: event.slug, accessMode: "public_qr" }))).status, 403);
  Object.assign(state.installation, identity);
  assert.equal((await sessions.POST(request({ qr: other.public_qr_token, slug: other.slug, accessMode: "public_qr" }))).status, 403);
  assert.equal((await db.query("SELECT count(*)::int AS n FROM upload_sessions")).rows[0].n, 0);
  assert.equal((await wipe.POST(request({ slug: event.slug, confirmation: "BORRAR TODO" }))).status, 200);
  assert.equal(await getInstallationEvent(), null);
  assert.equal((await db.query("SELECT public_qr_token FROM events")).rows[0].public_qr_token, other.public_qr_token);
});

test("gallery and APIs reject a copied slug with the wrong deployment identity", async () => {
  state.installation.DEPLOYMENT_ID = "wrong-clone";
  assert.equal((await photos.GET(new Request(`http://local/api?slug=${event.slug}`))).status, 404);
  await assert.rejects(gallery({ params: Promise.resolve({ slug: event.slug }) }), /TEST_NOT_FOUND/);
  assert.equal((await setup.PUT(request(input))).status, 409);
});

test("completion requires a real resource and ignores forged client metadata and scores", async () => {
  const session = await open(); const auth = await authorize(session);
  state.resourceError = new Error("Resource not found");
  assert.equal((await complete(session, auth, { nsfwScore: 0 })).status, 502);
  assert.equal((await db.query("SELECT photo_count FROM upload_sessions")).rows[0].photo_count, 0);
  assert.equal((await db.query("SELECT status FROM upload_authorizations")).rows[0].status, "reserved");
  state.resourceError = null; state.serverScore = 0.9;
  assert.equal((await complete(session, auth, { nsfwScore: 0, width: 1, height: 1, sizeKb: 0 })).status, 200);
  const photo = (await db.query("SELECT * FROM photos")).rows[0];
  assert.equal(photo.status, "pending"); assert.equal(photo.nsfw_score, 0.9);
  assert.equal(photo.original_width, 1920); assert.equal(photo.size_kb, 123);
  assert.match(photo.cloudinary_public_id, /^weddings\/nuestra-boda\/public\/upload-/);
  const resumed = await (await sessions.POST(request({ qr: event.public_qr_token, slug: event.slug, accessMode: "public_qr", sessionToken: session.sessionToken }))).json();
  assert.equal(auth.remaining, resumed.remaining);
});

test("server scores below threshold approve; classifier failure remains pending", async () => {
  for (const [score, expected] of [[0.69, "approved"], [0.7, "pending"], [null, "pending"]]) {
    state.serverScore = score;
    const session = await open(); const auth = await authorize(session);
    const id = (await (await complete(session, auth, { nsfwScore: 0 })).json()).id;
    assert.equal((await db.query("SELECT status FROM photos WHERE id=$1", [id])).rows[0].status, expected);
  }
});

test("approved test photos never reach the gallery or the real photo broadcast", async () => {
  const run = (await (await testing.POST(request({ slug: event.slug, action: "create" }))).json()).run;
  const session = await (await sessions.POST(request({ qr: run.token, slug: event.slug, accessMode: "public_qr" }))).json();
  state.serverScore = 0.1;
  const auth = await authorize(session);
  assert.equal((await complete(session, auth)).status, 200);
  assert.deepEqual(state.broadcasts, []);
  await db.exec("UPDATE events SET reveal_at=now()-interval '1 minute'");
  const tree = await gallery({ params: Promise.resolve({ slug: event.slug }) });
  assert.equal(tree.props.children[1].props.photos.length, 0);
  assert.equal((await (await photos.GET(new Request(`http://local/api?slug=${event.slug}`))).json()).photos.length, 0);
});

test("partial Cloudinary deletion keeps test references and uses full reserved IDs", async () => {
  const run = (await (await testing.POST(request({ slug: event.slug, action: "create" }))).json()).run;
  const session = await (await sessions.POST(request({ qr: run.token, slug: event.slug, accessMode: "public_qr" }))).json();
  const auth = await authorize(session);
  state.cloudResult = { deleted: {} };
  assert.equal((await testing.POST(request({ slug: event.slug, action: "cleanup", runId: run.id }))).status, 502);
  assert.equal(state.cloudCalls[0][0], `weddings/${event.slug}/test/${run.id}/${auth.publicId}`);
  assert.equal((await db.query("SELECT status FROM upload_test_runs")).rows[0].status, "cleanup_pending");
  assert.equal((await db.query("SELECT count(*)::int AS n FROM upload_authorizations")).rows[0].n, 1);
  state.cloudResult = null;
  assert.equal((await testing.POST(request({ slug: event.slug, action: "cleanup", runId: run.id }))).status, 200);
});

test("individual deletion and event wipe retain references on external failure", async () => {
  const session = await open(); const auth = await authorize(session);
  const photo = await (await complete(session, auth)).json();
  state.cloudResult = new Error("Cloudinary unavailable");
  assert.equal((await adminPhotos.POST(request({ id: photo.id, action: "delete" }))).status, 502);
  assert.equal((await db.query("SELECT count(*)::int AS n FROM photos")).rows[0].n, 1);
  state.cloudResult = { deleted: {} };
  assert.equal((await wipe.POST(request({ slug: event.slug, confirmation: "BORRAR TODO" }))).status, 502);
  assert.equal((await db.query("SELECT count(*)::int AS n FROM upload_authorizations")).rows[0].n, 1);
  state.cloudResult = null;
  assert.equal((await wipe.POST(request({ slug: event.slug, confirmation: "BORRAR TODO" }))).status, 200);
});

test("both photo clients retrieve all pages beyond 200 and 500 rows", async () => {
  await db.query("INSERT INTO photos(event_id,cloudinary_public_id,cloudinary_url,thumbnail_url,status) SELECT $1, 'photo-'||n, 'https://test/'||n, 'https://test/thumb/'||n, 'approved' FROM generate_series(1, 507) n", [event.id]);
  const original = globalThis.fetch;
  const visited = [];
  globalThis.fetch = async (url) => { visited.push(url); return url.includes("/admin/") ? adminPhotos.GET(new Request(`http://local${url}`)) : photos.GET(new Request(`http://local${url}`)); };
  try {
    assert.equal((await fetchPhotoPages(`/api/photos?slug=${event.slug}`)).photos.length, 507);
    assert.equal((await fetchPhotoPages(`/api/admin/photos?slug=${event.slug}`)).photos.length, 507);
    assert.ok(visited.some((url) => url.endsWith("offset=400")));
    assert.ok(visited.some((url) => url.endsWith("offset=500")));
  } finally { globalThis.fetch = original; }
  assert.equal((await photos.GET(new Request(`http://local/api?slug=${event.slug}&offset=-1`))).status, 400);
});

test("family creation uses the event default, rolls back and blocks paused RSVP", async () => {
  await db.exec("DELETE FROM events");
  await setup.PUT(request({ ...input, access_mode: "invitations", max_photos_per_session: 37, families: [{ name: "Family", max_photos: 37 }] }));
  assert.equal((await tables.POST()).status, 200);
  const family = (await db.query("SELECT t.*,g.name FROM table_qrs t JOIN guests g ON g.table_qr_id=t.id WHERE table_number=2")).rows[0];
  assert.equal(family.max_photos, 37); assert.equal(family.name, "Familia 2");
  await db.exec(`CREATE FUNCTION fail_audit_guest() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'rollback'; END; $$;
    CREATE TRIGGER fail_audit BEFORE INSERT ON guests FOR EACH ROW EXECUTE FUNCTION fail_audit_guest();`);
  try {
    assert.equal((await tables.POST()).status, 500);
    assert.equal((await db.query("SELECT count(*)::int AS n FROM table_qrs")).rows[0].n, 2);
  } finally { await db.exec("DROP TRIGGER fail_audit ON guests; DROP FUNCTION fail_audit_guest()"); }
  const outcomes = await Promise.all([tables.POST(), tables.POST()]);
  assert.ok(outcomes.every((r) => [200, 409].includes(r.status)));
  assert.equal((await db.query("SELECT count(*)::int AS n FROM (SELECT table_number FROM table_qrs GROUP BY table_number HAVING count(*)>1) x")).rows[0].n, 0);
  await tables.PATCH(request({ table_number: 2, upload_paused: true }));
  assert.equal((await rsvp.POST(request({ token: family.qr_token, name: "Family", status: "accepted", guests: 1 }))).status, 403);
  assert.equal((await db.query("SELECT rsvp_status FROM guests WHERE token=$1", [family.qr_token])).rows[0].rsvp_status, "pending");
});

test("legacy consumption survives deletion and repeated migrations", async () => {
  await db.exec("DELETE FROM events");
  await setup.PUT(request({ ...input, access_mode: "invitations", families: [{ name: "Legacy", max_photos: 24 }] }));
  const own = await getInstallationEvent();
  const family = (await db.query("SELECT * FROM table_qrs")).rows[0];
  await db.query("INSERT INTO upload_sessions(event_id,table_qr_id,session_token,photo_count) VALUES($1,$2,'legacy-token',7)", [own.id, family.id]);
  await db.query("UPDATE table_qrs SET photo_count=7, legacy_photo_count=7 WHERE id=$1", [family.id]);
  await db.query("INSERT INTO photos(event_id,table_qr_id,cloudinary_public_id,cloudinary_url,thumbnail_url) VALUES($1,$2,'old-photo','https://test/full','https://test/thumb')", [own.id, family.id]);
  const session = (await db.query("SELECT * FROM upload_sessions")).rows[0];
  assert.equal((await uploadAllowance(own, session)).uploaded, 7);
  await db.exec("DELETE FROM photos"); await migrate();
  assert.equal((await uploadAllowance(own, session)).uploaded, 7);
});

test("export fails explicitly instead of returning an incomplete ZIP", async () => {
  await db.query("INSERT INTO photos(event_id,cloudinary_public_id,cloudinary_url,thumbnail_url,status) VALUES($1,'photo','https://test/failure','https://test/thumb','approved')", [event.id]);
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response("unavailable", { status: 503 });
  try {
    const response = await exporting.GET(new Request(`http://local/api?slug=${event.slug}`));
    assert.equal(response.status, 502); assert.equal(response.headers.get("content-type"), "application/json");
  } finally { globalThis.fetch = original; }
});
