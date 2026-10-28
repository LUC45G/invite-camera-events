import assert from "node:assert/strict";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { applyMigrations, splitSqlStatements } from "../scripts/migration-utils.mts";

test("SQL splitting preserves quoted semicolons, comments and function bodies", () => {
  const statements = splitSqlStatements(`SELECT 'a;''b'; /* ; */ SELECT "a;b"; DO $test$ BEGIN RAISE NOTICE ';'; END $test$; -- ;\n SELECT 3;`);
  assert.equal(statements.length, 4);
  assert.match(statements[2], /END \$test\$/);
});

test("real migration order upgrades legacy schema and replays with two registered events", async () => {
  const db = new PGlite();
  const migrate = () => applyMigrations((statements) => db.transaction(async (tx) => {
    for (const statement of statements) {
      if (statement.includes('CREATE EXTENSION IF NOT EXISTS "pgcrypto"')) continue;
      await tx.exec(statement);
    }
  }));
  try {
    await db.exec(`CREATE TABLE events (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, slug text UNIQUE NOT NULL, reveal_at timestamptz, upload_open boolean DEFAULT true, max_photos_per_session int DEFAULT 24, projection_enabled boolean DEFAULT true, slideshow_interval int DEFAULT 5, created_at timestamptz DEFAULT now());
      INSERT INTO events(name,slug) VALUES ('Legacy','event-a'); CREATE UNIQUE INDEX events_single_installation ON events((true));`);
    await migrate();
    await db.exec(`UPDATE events SET deployment_id='clone-a', hostname='a.example.com';
      INSERT INTO events(name,slug,deployment_id,hostname,public_qr_token,setup_complete) VALUES('B','event-b','clone-b','b.example.com','persistent-token',true);`);
    await db.exec(`WITH run AS (
      INSERT INTO upload_test_runs(event_id,token,expires_at)
      SELECT id,'existing-test-token',now()+interval '30 minutes' FROM events WHERE slug='event-a'
      RETURNING id,event_id
    ) INSERT INTO upload_sessions(event_id,table_qr_id,session_token,access_mode,test_run_id)
      SELECT event_id,NULL,'existing-test-session','invitations',id FROM run;`);
    const sessionsBefore = (await db.query("SELECT id,session_token,test_run_id FROM upload_sessions")).rows;
    await migrate();
    await migrate();
    assert.deepEqual((await db.query("SELECT id,session_token,test_run_id FROM upload_sessions")).rows, sessionsBefore);
    assert.equal((await db.query("SELECT count(*)::int AS n FROM events")).rows[0].n, 2);
    assert.equal((await db.query("SELECT public_qr_token FROM events WHERE slug='event-b'")).rows[0].public_qr_token, "persistent-token");
    await assert.rejects(db.exec("INSERT INTO events(name,slug,hostname) VALUES('duplicate','other','B.EXAMPLE.COM')"), /unique/);
    await assert.rejects(db.exec("INSERT INTO events(name,slug,deployment_id) VALUES('duplicate','other','clone-b')"), /unique/);
    await assert.rejects(db.exec("INSERT INTO events(name,slug) VALUES('duplicate','event-b')"), /unique/);
    await db.exec("DELETE FROM events WHERE slug='event-a' AND deployment_id='clone-a' AND hostname='a.example.com'");
    assert.equal((await db.query("SELECT public_qr_token FROM events")).rows[0].public_qr_token, "persistent-token");
  } finally { await db.close(); }
});
