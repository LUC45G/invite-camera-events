// Reset seguro de desarrollo: borra todo, reaplica schema/migraciones y crea
// un evento nuevo. Sin --yes solo muestra el plan y nunca modifica la base.
// Uso: node --experimental-strip-types scripts/reset-db.mts [--yes]
import { neon } from "@neondatabase/serverless";
import { readFileSync, readdirSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { config } from "dotenv";

// ===== CONFIGURACION DE DESARROLLO (editar antes de correr con --yes) =====
const EVENT_NAME = "Boda Sofia & Mateo";
const EVENT_SLUG = "nuestra-boda";
const ACCESS_MODE = "invitations" as "invitations" | "public_qr";
const NUM_FAMILIES = 5;
const MAX_PHOTOS = 24;
const STARTS_AT = "2027-11-05 20:00:00-03";
const UPLOAD_STARTS_AT = "2027-11-05 12:00:00-03";
const UPLOAD_ENDS_AT = "2027-11-06 12:00:00-03";
const REVEAL_AT = "2027-11-07 12:00:00-03";
// ===========================================================================

config({ path: ".env.local", quiet: true });
if (!process.env.DATABASE_URL) throw new Error("Falta DATABASE_URL");
const sql = neon(process.env.DATABASE_URL);
const yes = process.argv.includes("--yes");
const publicQrToken = ACCESS_MODE === "public_qr" ? randomBytes(32).toString("hex") : null;

function splitSqlStatements(source: string): string[] {
  const result: string[] = [];
  let start = 0;
  let i = 0;
  let quote: "'" | '"' | null = null;
  let dollarTag: string | null = null;
  let lineComment = false;
  let blockComment = false;

  while (i < source.length) {
    const current = source[i];
    const next = source[i + 1];
    if (lineComment) { if (current === "\n") lineComment = false; i++; continue; }
    if (blockComment) { if (current === "*" && next === "/") { blockComment = false; i += 2; } else i++; continue; }
    if (dollarTag) { if (source.startsWith(dollarTag, i)) { i += dollarTag.length; dollarTag = null; } else i++; continue; }
    if (quote) {
      if (current === quote) { if (next === quote) i += 2; else { quote = null; i++; } }
      else i++;
      continue;
    }
    if (current === "-" && next === "-") { lineComment = true; i += 2; continue; }
    if (current === "/" && next === "*") { blockComment = true; i += 2; continue; }
    if (current === "'" || current === '"') { quote = current; i++; continue; }
    if (current === "$") {
      const match = source.slice(i).match(/^\$[A-Za-z_0-9]*\$/);
      if (match) { dollarTag = match[0]; i += dollarTag.length; continue; }
    }
    if (current === ";") {
      const statement = source.slice(start, i).trim();
      if (statement) result.push(statement);
      start = i + 1;
    }
    i++;
  }
  const final = source.slice(start).trim();
  if (final) result.push(final);
  return result;
}

const plan = [
  `TRUNCATE evento, familias, invitados, sesiones, fotos y pruebas (${EVENT_SLUG})`,
  "Reaplicar db/schema.sql y todas las migraciones",
  `Crear evento ${ACCESS_MODE === "public_qr" ? "con QR unico" : `con ${NUM_FAMILIES} familias`} y ventana de carga configurada`,
  "Regenerar tokens: los QRs anteriores quedan invalidos",
];

if (!yes) {
  console.log("PLAN DE RESET (nada ejecutado):");
  plan.forEach((item) => console.log(" -", item));
  console.log("\nCorrer de nuevo con --yes para ejecutar.");
  process.exit(0);
}

console.log("Ejecutando reset...\n");
const schema = readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8");
for (const statement of splitSqlStatements(schema)) await sql.query(statement);
const migrations = new URL("../db/migrations/", import.meta.url);
for (const filename of readdirSync(migrations).filter((name) => name.endsWith(".sql")).sort()) {
  const source = readFileSync(new URL(filename, migrations), "utf8");
  for (const statement of splitSqlStatements(source)) await sql.query(statement);
  console.log(`Migracion aplicada: ${filename}`);
}
await sql.query("TRUNCATE TABLE photos, upload_sessions, upload_authorizations, upload_test_runs, guests, table_qrs, events RESTART IDENTITY CASCADE");
console.log("TRUNCATE OK");

const [event] = await sql`
  INSERT INTO events (
    name, slug, access_mode, starts_at, reveal_at, upload_starts_at,
    upload_ends_at, max_photos_per_session, setup_complete, public_qr_token
  ) VALUES (
    ${EVENT_NAME}, ${EVENT_SLUG}, ${ACCESS_MODE}, ${STARTS_AT}, ${REVEAL_AT},
    ${UPLOAD_STARTS_AT}, ${UPLOAD_ENDS_AT}, ${MAX_PHOTOS}, true,
    ${publicQrToken}
  ) RETURNING id, public_qr_token`;

if (ACCESS_MODE === "invitations") {
  await sql`
    INSERT INTO table_qrs (event_id, table_number, qr_token, max_photos)
    SELECT ${event.id}, number, encode(gen_random_bytes(32), 'hex'), ${MAX_PHOTOS}
    FROM generate_series(1, ${NUM_FAMILIES}) AS number`;
  await sql`
    INSERT INTO guests (event_id, table_qr_id, token, name)
    SELECT t.event_id, t.id, t.qr_token, 'Familia ' || t.table_number
    FROM table_qrs t WHERE t.event_id = ${event.id}`;
}

const families = await sql`
  SELECT table_number, qr_token FROM table_qrs WHERE event_id = ${event.id} ORDER BY table_number`;
console.log(`RESET OK - ${ACCESS_MODE === "public_qr" ? "QR unico" : `${families.length} familias`}`);
if (event.public_qr_token) console.log(`QR unico: ${event.public_qr_token}`);
for (const family of families) console.log(`Familia ${family.table_number}: ${family.qr_token}`);
