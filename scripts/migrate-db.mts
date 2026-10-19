import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
import { applyMigrations } from "./migration-utils.mts";
import { parseInstallationConfig } from "../lib/installation-config.ts";

config({ path: ".env.local", quiet: true });
if (!process.env.DATABASE_URL) throw new Error("Falta DATABASE_URL");
const installation = parseInstallationConfig(process.env);
const sql = neon(process.env.DATABASE_URL);

await applyMigrations((statements) => sql.transaction(statements.map((s) => sql.query(s))));
await sql`
  UPDATE events SET deployment_id = ${installation.DEPLOYMENT_ID}, hostname = ${installation.EVENT_HOSTNAME}
  WHERE slug = ${installation.EVENT_SLUG} AND deployment_id IS NULL AND hostname IS NULL
`;
const conflicts = await sql`
  SELECT id FROM events
  WHERE (slug = ${installation.EVENT_SLUG} OR deployment_id = ${installation.DEPLOYMENT_ID} OR hostname = ${installation.EVENT_HOSTNAME})
    AND (slug, deployment_id, hostname) IS DISTINCT FROM (${installation.EVENT_SLUG}, ${installation.DEPLOYMENT_ID}, ${installation.EVENT_HOSTNAME})
`;
if (conflicts.length) throw new Error("El slug, despliegue o subdominio ya pertenece a otra instalación");
console.log("Base preparada. Tokens conservados; ningún evento creado ni borrado.");
