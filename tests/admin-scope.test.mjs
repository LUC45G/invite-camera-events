import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const event = { id: "installation", slug: "custom-slug", slideshow_interval: 5 };
const state = { events: [event], queries: [], admin: true, cloudCalls: 0 };
globalThis.__adminScopeTest = state;
const moduleUrl = (source) => `data:text/javascript,${encodeURIComponent(source)}`;
const mocks = {
  "@/lib/db": moduleUrl(`export const sql = (strings, ...values) => {
    const state = globalThis.__adminScopeTest;
    const query = strings.join("?");
    state.queries.push({ query, values });
    if (query.includes("SELECT * FROM events")) return Promise.resolve(state.events);
    if (query.includes("SELECT slideshow_interval")) return Promise.resolve([{slideshow_interval: 5}]);
    return Promise.resolve([]);
  };`),
  "@/lib/admin-auth": moduleUrl("export const isAdmin = async () => globalThis.__adminScopeTest.admin;"),
  "@/lib/cloudinary": moduleUrl("export const cloudinary = { api: { usage: async () => { globalThis.__adminScopeTest.cloudCalls++; return {}; } }, uploader: { destroy: async () => { globalThis.__adminScopeTest.cloudCalls++; } } };"),
  "@/lib/sse": moduleUrl("export const broadcastSlideshow = () => {}; export const broadcastPhotosChanged = () => {};"),
  "next/server": moduleUrl("export const NextResponse = Response;"),
};
registerHooks({ resolve(specifier, context, nextResolve) {
  if (mocks[specifier]) return { url: mocks[specifier], shortCircuit: true };
  if (specifier.startsWith("@/")) return { url: new URL(specifier.slice(2) + ".ts", root).href, shortCircuit: true };
  if (specifier.startsWith(".") && context.parentURL?.endsWith(".ts")) {
    const candidate = new URL(specifier + ".ts", context.parentURL);
    if (existsSync(fileURLToPath(candidate))) return { url: candidate.href, shortCircuit: true };
  }
  return nextResolve(specifier, context);
} });

const tables = await import("../app/api/admin/tables/route.ts");
const photos = await import("../app/api/admin/photos/route.ts");
const slideshow = await import("../app/api/admin/slideshow/route.ts");
const storage = await import("../app/api/admin/storage/route.ts");

test.beforeEach(() => {
  state.events = [event]; state.admin = true; state.queries = []; state.cloudCalls = 0;
});

test("sin admin no consulta ni modifica datos", async () => {
  state.admin = false;
  assert.equal((await tables.GET()).status, 401);
  assert.equal(state.queries.length, 0);
});

test("sin evento no actualiza la velocidad globalmente", async () => {
  state.events = [];
  const response = await slideshow.POST(new Request("http://local/api", { method: "POST", body: JSON.stringify({action: "speed", value: 8}) }));
  assert.equal(response.status, 404);
  assert.equal(state.queries.some(({query}) => query.includes("UPDATE")), false);
});

test("un slug ajeno se rechaza antes de acceder a Cloudinary", async () => {
  const response = await storage.GET(new Request("http://local/api?slug=another-event"));
  assert.equal(response.status, 404);
  assert.equal(state.cloudCalls, 0);
});

test("las familias se consultan dentro del evento configurado", async () => {
  assert.equal((await tables.GET()).status, 200);
  const read = state.queries.find(({query}) => query.includes("FROM table_qrs"));
  assert.match(read.query, /WHERE t\.event_id/);
  assert.deepEqual(read.values, [event.id]);
});

test("una foto ajena no se aprueba ni se elimina de Cloudinary", async () => {
  const response = await photos.POST(new Request("http://local/api", { method: "POST", body: JSON.stringify({ id: "0ab2d3a4-5d6e-4789-a012-b34567890123", action: "delete" }) }));
  assert.equal(response.status, 404);
  assert.equal(state.cloudCalls, 0);
  assert.equal(state.queries.some(({query}) => /UPDATE|DELETE/.test(query)), false);
  const lookup = state.queries.find(({query}) => query.includes("FROM photos"));
  assert.match(lookup.query, /AND event_id/);
  assert.equal(lookup.values[1], event.id);
});

test("la velocidad se modifica solamente en el evento configurado", async () => {
  const response = await slideshow.POST(new Request("http://local/api", { method: "POST", body: JSON.stringify({ action: "speed", value: 8 }) }));
  assert.equal(response.status, 200);
  const update = state.queries.find(({query}) => query.includes("UPDATE"));
  assert.match(update.query, /WHERE id/);
  assert.deepEqual(update.values, [8, event.id]);
});
