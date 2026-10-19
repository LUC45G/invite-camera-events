// Reset de desarrollo: limpia solo el evento configurado y crea
// un evento nuevo. Sin --yes solo muestra el plan y nunca modifica la base.
// Uso: node --experimental-strip-types scripts/reset-db.mts [--yes]
import { neon } from "@neondatabase/serverless";
import { applyMigrations } from "./migration-utils.mts";
import { parseInstallationConfig } from "../lib/installation-config.ts";
import { deleteEventData } from "../lib/event-deletion.ts";
import { v2 as cloudinary } from "cloudinary";
import { randomBytes } from "node:crypto";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });
if (!process.env.DATABASE_URL) throw new Error("Falta DATABASE_URL");
const sql = neon(process.env.DATABASE_URL);

// ===== CONFIGURACION DE DESARROLLO (editar antes de correr con --yes) =====
const EVENT_NAME = "Boda Sofia & Mateo";
const { EVENT_SLUG, DEPLOYMENT_ID, EVENT_HOSTNAME } = parseInstallationConfig(process.env);
const ACCESS_MODE = "invitations" as "invitations" | "public_qr";
const NUM_FAMILIES = 5;
const MAX_PHOTOS = 24;
const STARTS_AT = "2027-11-05 20:00:00-03";
const UPLOAD_STARTS_AT = "2027-11-05 12:00:00-03";
const UPLOAD_ENDS_AT = "2027-11-06 12:00:00-03";
const REVEAL_AT = "2027-11-07 12:00:00-03";
// ===========================================================================

const yes = process.argv.includes("--yes");
const publicQrToken = ACCESS_MODE === "public_qr" ? randomBytes(32).toString("hex") : null;

const plan = [
  `Borrar solamente el evento ${EVENT_SLUG} (${EVENT_HOSTNAME}) y sus relaciones`,
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
await applyMigrations((statements) => sql.transaction(statements.map((s) => sql.query(s))));
const owned = await sql`SELECT id FROM events WHERE slug = ${EVENT_SLUG} AND deployment_id = ${DEPLOYMENT_ID} AND hostname = ${EVENT_HOSTNAME}`;
if (owned[0]) {
  cloudinary.config({ cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });
  await deleteEventData((text, values) => sql.query(text, values),
    (ids) => cloudinary.api.delete_resources(ids, { resource_type: "image", type: "upload", invalidate: true }), String(owned[0].id));
}
const [event] = await sql`
  INSERT INTO events (
    name, slug, deployment_id, hostname, access_mode, starts_at, reveal_at, upload_starts_at,
    upload_ends_at, max_photos_per_session, setup_complete, public_qr_token
  ) VALUES (
    ${EVENT_NAME}, ${EVENT_SLUG}, ${DEPLOYMENT_ID}, ${EVENT_HOSTNAME}, ${ACCESS_MODE}, ${STARTS_AT}, ${REVEAL_AT},
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
