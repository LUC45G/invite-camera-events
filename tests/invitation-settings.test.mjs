import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { state, request } from "./helpers/setup-environment.mjs";

const setup = await import("../app/api/admin/setup/route.ts");
const settings = await import("../app/api/admin/invitation/route.ts");
const {DEFAULT_INVITATION_MESSAGE, DEFAULT_INVITATION_CONTACT, invitationContactSchema, familyInvitationLink, renderInvitationMessage} = await import("../lib/invitation-message.ts");
const {InvitationSettingsFields} = await import("../components/InvitationSettingsFields.tsx");
const {AdminModeration} = await import("../components/AdminModeration.tsx");
const db = new PGlite();
const migration = readFileSync(new URL("../db/migrations/004-invitation-message-contact.sql", import.meta.url), "utf8");
const input = {name: "Admin internal name", starts_at: "2027-11-05T20:00:00-03:00", reveal_at: "2027-11-07T12:00:00-03:00", access_mode: "invitations", max_photos_per_session: 24,
  families: [{name: "Familia López", max_photos: 24}, {name: "Familia 2", max_photos: 12}]};

test.before(async () => {
  state.db = db;
  await db.exec(readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8").replace('CREATE EXTENSION IF NOT EXISTS "pgcrypto";', ""));
  for (const filename of ["001-event-setup.sql", "002-single-event-creation.sql", "003-public-upload-sessions.sql", "004-invitation-message-contact.sql"]) {
    await db.exec(readFileSync(new URL(`../db/migrations/${filename}`, import.meta.url), "utf8"));
  }
});
test.beforeEach(async () => { await db.exec("TRUNCATE events CASCADE"); state.admin = true; state.queries = []; });
test.after(async () => { await db.close(); });

test("setup guarda plantilla inicial sin derivar la pareja del nombre interno", async () => {
  assert.equal((await setup.PUT(request(input))).status, 201);
  const event = (await db.query("SELECT * FROM events")).rows[0];
  assert.equal(event.invitation_message, DEFAULT_INVITATION_MESSAGE);
  assert.equal(event.invitation_contact, DEFAULT_INVITATION_CONTACT);
  assert.match(event.invitation_message, /Daniela & Miguel/);
  assert.ok(!event.invitation_message.includes(input.name));
  assert.deepEqual(await (await settings.GET()).json(), {invitation_message: DEFAULT_INVITATION_MESSAGE, invitation_contact: DEFAULT_INVITATION_CONTACT});
});

test("multilínea, nombres provisionales y enlaces distintos se conservan al editar y remigrar", async () => {
  const template = "  Hola {nombre}\n\nAna y Luis te invitan.\nConfirmá: {link}\n¡Gracias!  ";
  const contact = "mailto:organizador@example.com?subject=Cambios%20de%20invitacion";
  assert.equal((await setup.PUT(request({...input, invitation_message: template, invitation_contact: contact}))).status, 201);
  const families = (await db.query("SELECT g.name, g.token, t.qr_token FROM guests g JOIN table_qrs t ON t.id = g.table_qr_id ORDER BY t.table_number")).rows;
  const event = (await db.query("SELECT * FROM events")).rows[0];
  const firstLink = familyInvitationLink("https://boda.example", event.slug, families[0].token);
  const secondLink = familyInvitationLink("https://boda.example", event.slug, families[1].token);
  assert.notEqual(firstLink, secondLink);
  assert.equal(renderInvitationMessage(template, families[0].name, firstLink), `  Hola Familia López\n\nAna y Luis te invitan.\nConfirmá: ${firstLink}\n¡Gracias!  `);
  assert.match(renderInvitationMessage(template, families[1].name, secondLink), /Familia 2/);
  const changed = {invitation_message: "Hola {nombre}\nTu invitación: {link}", invitation_contact: "https://github.com/LUC45G/invite-camera-events/issues"};
  assert.equal((await settings.PUT(request(changed))).status, 200);
  await db.exec(migration); await db.exec(migration);
  assert.deepEqual(await (await settings.GET()).json(), changed);
  const after = (await db.query("SELECT name, token FROM guests ORDER BY name")).rows;
  assert.deepEqual(after, families.map(f => ({name: f.name, token: f.token})).sort((a,b) => a.name.localeCompare(b.name)));
  assert.equal((await db.query("SELECT name FROM events")).rows[0].name, input.name);
});

test("migración completa defaults existentes sin regenerar tokens y conservar setup permite editar mensaje", async () => {
  await setup.PUT(request(input));
  const tokens = (await db.query("SELECT qr_token FROM table_qrs ORDER BY table_number")).rows;
  await db.exec("UPDATE events SET invitation_message = NULL, invitation_contact = NULL, setup_complete = false");
  await db.exec(migration);
  assert.equal((await db.query("SELECT invitation_message FROM events")).rows[0].invitation_message, DEFAULT_INVITATION_MESSAGE);
  const retained = {starts_at: input.starts_at, reveal_at: input.reveal_at, invitation_message: "Confirmá acá: {link}", invitation_contact: "mailto:ayuda@example.com"};
  assert.equal((await setup.POST(request(retained))).status, 200);
  assert.equal((await (await settings.GET()).json()).invitation_message, retained.invitation_message);
  assert.deepEqual((await db.query("SELECT qr_token FROM table_qrs ORDER BY table_number")).rows, tokens);
});

test("contactos y plantillas inválidos no actualizan ni crean datos", async () => {
  const invalidContacts = ["javascript:alert(1)", "http://github.com/repo", "data:text/html,hello", "mailto:no-email", "https://user:password@example.com", "https://example.com/\nfoo"];
  for (const invitation_contact of invalidContacts) {
    assert.equal((await setup.PUT(request({...input, invitation_contact}))).status, 400);
  }
  assert.equal((await db.query("SELECT count(*)::int AS n FROM events")).rows[0].n, 0);
  await setup.PUT(request(input));
  for (const invitation_contact of invalidContacts) assert.equal((await settings.PUT(request({invitation_contact, invitation_message: DEFAULT_INVITATION_MESSAGE}))).status, 400);
  for (const invitation_message of ["", "Sin enlace", "Hola {familia}: {link}", "x".repeat(4001) + "{link}"]) {
    assert.equal((await settings.PUT(request({invitation_contact: DEFAULT_INVITATION_CONTACT, invitation_message}))).status, 400);
  }
  assert.equal((await settings.PUT(request({invitation_message: DEFAULT_INVITATION_MESSAGE, invitation_contact: DEFAULT_INVITATION_CONTACT, slug: "other"}))).status, 400);
  assert.equal((await (await settings.GET()).json()).invitation_message, DEFAULT_INVITATION_MESSAGE);
});

test("solo admin y modo invitaciones pueden leer o editar estas opciones", async () => {
  state.admin = false;
  assert.equal((await settings.GET()).status, 401);
  assert.equal((await settings.PUT(request({}))).status, 401);
  assert.equal(state.queries.length, 0);
  state.admin = true;
  const {families, ...publicInput} = input;
  assert.equal((await setup.PUT(request({...publicInput, access_mode: "public_qr", invitation_message: DEFAULT_INVITATION_MESSAGE}))).status, 400);
  assert.equal((await setup.PUT(request({...publicInput, access_mode: "public_qr"}))).status, 201);
  assert.equal((await settings.GET()).status, 404);
  assert.equal((await settings.PUT(request({invitation_message: DEFAULT_INVITATION_MESSAGE, invitation_contact: DEFAULT_INVITATION_CONTACT}))).status, 404);
  const event = (await db.query("SELECT * FROM events")).rows[0];
  assert.equal(event.invitation_message, null); assert.equal(event.invitation_contact, null);
  const html = renderToStaticMarkup(createElement(AdminModeration, {slug: event.slug, eventName: event.name, accessMode: "public_qr", publicToken: event.public_qr_token, sessionLimit: 24}));
  assert.doesNotMatch(html, /Mensaje y contacto de invitaciones|editar la información de las invitaciones/);
});

test("vista previa escapa HTML y no interpreta variables dentro del nombre de familia", () => {
  assert.equal(renderInvitationMessage("Hola {nombre}: {link}", "Familia {link}", "https://boda.example/invite"), "Hola Familia {link}: https://boda.example/invite");
  assert.equal(invitationContactSchema.safeParse("mailto:ayuda@example.com").success, true);
  const html = renderToStaticMarkup(createElement(InvitationSettingsFields, {
    message: "Hola {nombre}\n<script>alert(1)</script> {link}", contact: "javascript:alert(1)", previewName: "Familia 1", previewLink: "https://boda.example/invite",
    onMessage() {}, onContact() {},
  }));
  assert.match(html, /Familia 1/); assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /href="javascript:|<script>/);
});
