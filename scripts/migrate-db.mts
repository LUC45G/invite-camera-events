import { neon } from "@neondatabase/serverless";
import { readFileSync, readdirSync } from "node:fs";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });
if (!process.env.DATABASE_URL) throw new Error("Falta DATABASE_URL");
const sql = neon(process.env.DATABASE_URL);

// Apply tables first, then additive migrations. Never seed or wipe data.
const schema = readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8");
await sql.transaction(schema.split(";").filter((s) => s.trim()).map((s) => sql.query(s)));
const directory = new URL("../db/migrations/", import.meta.url);
for (const filename of readdirSync(directory).filter((f) => f.endsWith(".sql")).sort()) {
  const source = readFileSync(new URL(filename, directory), "utf8");
  await sql.transaction(source.split("-- statement-breakpoint").filter((s) => s.trim()).map((s) => sql.query(s)));
  console.log(`Migración aplicada: ${filename}`);
}
console.log("Base preparada. No se modificaron tokens ni se creó un evento.");
