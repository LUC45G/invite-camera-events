// Reset seguro de la DB: trunca todo, re-aplica schema y seed.
// Sin --yes solo muestra qué haría. Regenera todos los tokens → re-imprimir QRs.
// Uso: node --experimental-strip-types scripts/reset-db.mts [--yes]
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";
import { config } from "dotenv";

// ===== CONFIGURACIÓN (editar antes de correr) =====
const EVENT_NAME = "Boda Sofía & Mateo";
const EVENT_SLUG = "nuestra-boda";
const REVEAL_AT = "2026-09-12 23:59:00-03";
const NUM_TABLES = 5;
// ==================================================

const yes = process.argv.includes("--yes");
config({ path: ".env.local" });
const sql = neon(process.env.DATABASE_URL ?? "");

function statements(file: string) {
  return readFileSync(file, "utf8")
    .split("\n")
    .filter((l) => !l.trim().startsWith("--"))
    .join("\n")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

const plan = [
  `TRUNCATE fotos/sesiones/invitados/mesas/evento (todo el evento: ${EVENT_SLUG})`,
  `Re-aplicar db/schema.sql (idempotente)`,
  `Re-seed: evento "${EVENT_NAME}", ${NUM_TABLES} mesas, reveal ${REVEAL_AT}`,
  "Regenera TODOS los tokens → los QRs impresos anteriores quedan inválidos",
];

if (!yes) {
  console.log("PLAN DE RESET (nada ejecutado):");
  plan.forEach((p) => console.log(" -", p));
  console.log("\nCorrer de nuevo con --yes para ejecutar.");
  process.exit(0);
}

console.log("Ejecutando reset...\n");

await sql.query(
  `TRUNCATE TABLE photos, upload_sessions, guests, table_qrs, events RESTART IDENTITY CASCADE`,
);
console.log("TRUNCATE OK");

for (const stmt of statements("db/schema.sql")) await sql.query(stmt);
console.log("SCHEMA OK");

const seed = statements("db/seed.sql")
  .map((s) =>
    s
      .replace(/:'event_name'/g, `'${EVENT_NAME}'`)
      .replace(/:'event_slug'/g, `'${EVENT_SLUG}'`)
      .replace(/:'reveal_at'/g, `'${REVEAL_AT}'`)
      .replace(/:num_tables/g, String(NUM_TABLES)),
  );

let tokens: { table_number: number; qr_token: string }[] = [];
for (const stmt of seed) {
  if (stmt.startsWith("SELECT")) continue;
  await sql.query(stmt);
}
for (const stmt of seed) {
  if (!stmt.startsWith("SELECT")) continue;
  const rows = await sql.query(stmt);
  if (Array.isArray(rows) && rows.length && "table_number" in rows[0]) {
    tokens = rows as { table_number: number; qr_token: string }[];
  }
}
console.log(`SEED OK — ${tokens.length} mesas`);
printTokens(tokens);

function printTokens(tokens: { table_number: number; qr_token: string }[]) {
  console.log("\nQR / token de invitación por mesa:");
  for (const t of tokens) {
    console.log(`  Mesa ${t.table_number}: ${t.qr_token}`);
    console.log(`    QR:      /${EVENT_SLUG}/upload?qr=${t.qr_token}`);
    console.log(`    Invitación: /${EVENT_SLUG}?token=${t.qr_token}`);
  }
}
