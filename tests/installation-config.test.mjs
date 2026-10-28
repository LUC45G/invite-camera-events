import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { registerHooks } from "node:module";
import { parseInstallationConfig } from "../lib/installation-config.ts";

test("production uses actual installation variables and requires all three", () => {
  const source = { NODE_ENV: "production", EVENT_SLUG: "event-b", DEPLOYMENT_ID: "clone-b", EVENT_HOSTNAME: "B.Example.com" };
  assert.deepEqual(parseInstallationConfig(source), { EVENT_SLUG: "event-b", DEPLOYMENT_ID: "clone-b", EVENT_HOSTNAME: "b.example.com" });
  for (const key of ["EVENT_SLUG", "DEPLOYMENT_ID", "EVENT_HOSTNAME"]) assert.throws(() => parseInstallationConfig({ ...source, [key]: undefined }));
  for (const host of ["https://b.example.com", "b.example.com:3000", "b.example.com/path", "a..com"]) assert.throws(() => parseInstallationConfig({ ...source, EVENT_HOSTNAME: host }));
  const actual = execFileSync(process.execPath, ["--input-type=module", "-e", `
    const {env} = await import('./lib/env.ts');
    console.log(JSON.stringify([env.EVENT_SLUG, env.DEPLOYMENT_ID, env.EVENT_HOSTNAME]));
  `], { env: { ...process.env, ...source, DATABASE_URL: "test", CLOUDINARY_CLOUD_NAME: "test", NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: "test", CLOUDINARY_API_KEY: "test", CLOUDINARY_API_SECRET: "test", ADMIN_PASSWORD: "test" }, encoding: "utf8" });
  assert.deepEqual(JSON.parse(actual), ["event-b", "clone-b", "b.example.com"]);
});

test("proxy rejects foreign hosts on pages and APIs and preserves QR query parameters", async () => {
  registerHooks({ resolve(specifier, context, next) { return next(specifier === "next/server" ? "next/server.js" : specifier, context); } });
  Object.assign(process.env, { EVENT_SLUG: "event-b", DEPLOYMENT_ID: "clone-b", EVENT_HOSTNAME: "b.example.com" });
  const { NextRequest } = await import("next/server.js");
  const { proxy, config } = await import("../proxy.ts");
  for (const path of ["/admin", "/api/admin/setup", "/api/upload/session"]) {
    assert.equal(proxy(new NextRequest(`http://a.example.com${path}`, { headers: { host: "a.example.com" } })).status, 404);
  }
  const rewritten = proxy(new NextRequest("http://b.example.com/?token=family", { headers: { host: "B.example.com" } }));
  assert.equal(new URL(rewritten.headers.get("x-middleware-rewrite")).pathname, "/event-b");
  assert.equal(new URL(rewritten.headers.get("x-middleware-rewrite")).search, "?token=family");
  const { default: testing } = await import("next/experimental/testing/server.js");
  assert.equal(testing.unstable_doesMiddlewareMatch({ config, nextConfig: {}, url: "/api/admin/setup" }), true);
  const previousMode = process.env.NODE_ENV;
  try {
    for (const host of ["localhost", "127.0.0.1", "[::1]"]) {
      process.env.NODE_ENV = "development";
      const local = new NextRequest(`http://${host}:3000/?token=family`, { headers: { host: `${host}:3000` } });
      assert.equal(new URL(proxy(local).headers.get("x-middleware-rewrite")).pathname, "/event-b");
      process.env.NODE_ENV = "production";
      assert.equal(proxy(local).status, 404);
    }
  } finally {
    if (previousMode === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousMode;
  }
});
