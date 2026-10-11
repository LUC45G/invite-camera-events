import { neon } from "@neondatabase/serverless";
import { readFileSync, readdirSync } from "node:fs";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });
if (!process.env.DATABASE_URL) throw new Error("Falta DATABASE_URL");
const sql = neon(process.env.DATABASE_URL);

function splitSqlStatements(source: string): string[] {
  const statements: string[] = [];
  let start = 0;
  let i = 0;
  let quote: "'" | '"' | null = null;
  let dollarTag: string | null = null;
  let lineComment = false;
  let blockComment = false;

  while (i < source.length) {
    const current = source[i];
    const next = source[i + 1];

    if (lineComment) {
      if (current === "\n") lineComment = false;
      i++;
      continue;
    }
    if (blockComment) {
      if (current === "*" && next === "/") { blockComment = false; i += 2; } else i++;
      continue;
    }
    if (dollarTag) {
      if (source.startsWith(dollarTag, i)) { i += dollarTag.length; dollarTag = null; } else i++;
      continue;
    }
    if (quote) {
      if (current === quote) {
        if (source[i + 1] === quote) i += 2;
        else { quote = null; i++; }
      } else i++;
      continue;
    }
    if (current === "-" && next === "-") { lineComment = true; i += 2; continue; }
    if (current === "/" && next === "*") { blockComment = true; i += 2; continue; }
    if (current === "'" || current === '"') { quote = current; i++; continue; }
    if (current === "$" ) {
      const match = source.slice(i).match(/^\$[A-Za-z_0-9]*\$/);
      if (match) { dollarTag = match[0]; i += dollarTag.length; continue; }
    }
    if (current === ";") {
      const statement = source.slice(start, i).trim();
      if (statement) statements.push(statement);
      start = i + 1;
    }
    i++;
  }

  const final = source.slice(start).trim();
  if (final) statements.push(final);
  return statements;
}

// Apply tables first, then additive migrations. Never seed or wipe data.
const schema = readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8");
await sql.transaction(splitSqlStatements(schema).map((s) => sql.query(s)));
const directory = new URL("../db/migrations/", import.meta.url);
for (const filename of readdirSync(directory).filter((f) => f.endsWith(".sql")).sort()) {
  const source = readFileSync(new URL(filename, directory), "utf8");
  await sql.transaction(splitSqlStatements(source).map((s) => sql.query(s)));
  console.log(`Migración aplicada: ${filename}`);
}
console.log("Base preparada. No se modificaron tokens ni se creó un evento.");
