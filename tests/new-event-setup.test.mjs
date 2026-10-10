import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { state, request } from "./helpers/setup-environment.mjs";

const setup = await import("../app/api/admin/setup/route.ts");
const rsvp = await import("../app/api/rsvp/route.ts");
const session = await import("../app/api/upload/session/route.ts");
const settings = await import("../app/api/admin/event/route.ts");
const db = new PGlite();
const input = {
  name: "Wedding setup", starts_at: "2027-11-05T20:00:00-03:00", reveal_at: "2027-11-07T12:00:00-03:00",
  access_mode: "invitations", max_photos_per_session: 24,
  families: [{name: "Familia uno", max_photos: 24}, {name: "Familia dos", max_photos: 12}],
};
const migration2 = readFileSync(new URL("../db/migrations/002-single-event-creation.sql", import.meta.url), "utf8");

test.before(async () => {
  state.db = db;
  const schema = readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8").replace('CREATE EXTENSION IF NOT EXISTS "pgcrypto";', "");
  await db.exec(schema);
  await db.exec(readFileSync(new URL("../db/migrations/001-event-setup.sql", import.meta.url), "utf8"));
  await db.exec(migration2);
});
test.beforeEach(async () => {
  await db.exec("TRUNCATE events CASCADE");
  state.admin = true; state.queries = [];
});
test.after(async () => { await db.close(); });

test("solo un administrador puede crear el evento", async () => {
  state.admin = false;
  assert.equal((await setup.PUT(request(input))).status, 401);
  assert.equal(state.queries.length, 0);
});

test("crea evento/familias/RSVP juntos con cupos y tokens independientes", async () => {
  const response = await setup.PUT(request(input));
  assert.equal(response.status, 201);
  const event = (await db.query("SELECT * FROM events")).rows[0];
  assert.equal(event.name, input.name);
  assert.equal(event.setup_complete, true);
  assert.equal(event.access_mode, "invitations");
  assert.equal(event.max_photos_per_session, 24);
  assert.equal(new Date(event.starts_at).toISOString(), "2027-11-05T23:00:00.000Z");
  const families = (await db.query("SELECT t.table_number, t.qr_token, t.max_photos, g.name, g.token FROM table_qrs t JOIN guests g ON g.table_qr_id = t.id ORDER BY t.table_number")).rows;
  assert.equal(families.length, 2);
  assert.equal(families[0].name, "Familia uno");
  assert.equal(families[1].max_photos, 12);
  assert.notEqual(families[0].qr_token, families[1].qr_token);
  assert.equal(families[0].token, families[0].qr_token);
  assert.equal((await setup.PUT(request(input))).status, 409);
  assert.deepEqual((await db.query("SELECT qr_token FROM table_qrs ORDER BY table_number")).rows, families.map((f) => ({qr_token: f.qr_token})));
});

test("dos creaciones simultáneas dejan exactamente un evento", async () => {
  const responses = await Promise.all([setup.PUT(request(input)), setup.PUT(request({...input, name: "Other attempt"}))]);
  assert.deepEqual(responses.map(r => r.status).sort(), [201, 409]);
  assert.equal((await db.query("SELECT count(*)::int AS n FROM events")).rows[0].n, 1);
  assert.equal((await db.query("SELECT count(*)::int AS n FROM table_qrs")).rows[0].n, 2);
});

test("un fallo al crear invitados revierte también evento y familias", async () => {
  await db.exec(`CREATE FUNCTION fail_setup_guest() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test rollback'; END; $$;
    CREATE TRIGGER fail_setup BEFORE INSERT ON guests FOR EACH ROW EXECUTE FUNCTION fail_setup_guest();`);
  try {
    assert.equal((await setup.PUT(request(input))).status, 500);
    assert.equal((await db.query("SELECT count(*)::int AS n FROM events")).rows[0].n, 0);
    assert.equal((await db.query("SELECT count(*)::int AS n FROM table_qrs")).rows[0].n, 0);
  } finally {
    await db.exec("DROP TRIGGER fail_setup ON guests; DROP FUNCTION fail_setup_guest()");
  }
});

test("datos inválidos no crean registros", async () => {
  const cases = [
    {...input, access_mode: "public_qr"}, {...input, families: []},
    {...input, families: [{name: " ", max_photos: 24}]},
    {...input, max_photos_per_session: 0}, {...input, families: [{name: "Family", max_photos: 101}]},
    {...input, reveal_at: "2027-11-06T12:00:00-03:00"}, {...input, slug: "other"},
  ];
  for (const body of cases) assert.equal((await setup.PUT(request(body))).status, 400);
  assert.equal((await db.query("SELECT count(*)::int AS n FROM events")).rows[0].n, 0);
});

test("modalidad inmutable tanto en API como en la base", async () => {
  await setup.PUT(request(input));
  const event = (await db.query("SELECT slug FROM events")).rows[0];
  assert.equal((await settings.POST(request({slug: event.slug, access_mode: "public_qr"}))).status, 400);
  await assert.rejects(db.query("UPDATE events SET access_mode = 'public_qr'"), /no se puede modificar/);
  await db.exec(migration2);
  assert.equal((await db.query("SELECT access_mode FROM events")).rows[0].access_mode, "invitations");
});

test("familia creada puede responder RSVP y vincular un dispositivo", async () => {
  await setup.PUT(request(input));
  const family = (await db.query("SELECT qr_token FROM table_qrs WHERE table_number = 1")).rows[0];
  assert.equal((await session.POST(request({qr: family.qr_token}))).status, 403);
  assert.equal((await rsvp.POST(request({token: family.qr_token, name: "Familia uno", status: "accepted", guests: 3}))).status, 200);
  const confirmation = await session.POST(request({qr: family.qr_token}));
  assert.equal(confirmation.status, 200);
  assert.equal((await confirmation.json()).tableName, "Familia uno");
  const linked = await session.POST(request({qr: family.qr_token, confirmed: true}));
  assert.equal(linked.status, 200);
  const token = (await linked.json()).sessionToken;
  assert.equal((await session.POST(request({qr: family.qr_token, sessionToken: token}))).status, 200);
  assert.equal((await db.query("SELECT count(*)::int AS n FROM upload_sessions")).rows[0].n, 1);
});
