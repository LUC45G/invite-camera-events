import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

registerHooks({ resolve(specifier, context, next) {
  if (specifier === "@/lib/env") return { url: `data:text/javascript,${encodeURIComponent("export const env = { CLOUDINARY_CLOUD_NAME: 'audit', CLOUDINARY_API_KEY: 'audit', CLOUDINARY_API_SECRET: 'audit' };")}`, shortCircuit: true };
  if (specifier.startsWith(".") && context.parentURL?.endsWith(".ts")) {
    const candidate = new URL(specifier + ".ts", context.parentURL);
    if (existsSync(fileURLToPath(candidate))) return { url: candidate.href, shortCircuit: true };
  }
  return next(specifier, context);
} });
const { cloudinary, verifyUploadedImage } = await import("../lib/cloudinary.ts");

test("real resource verification rejects nonexistent or mismatched uploads", async () => {
  const original = cloudinary.api.resource;
  const fullId = "weddings/a/public/upload-test";
  try {
    cloudinary.api.resource = async () => { throw new Error("not found"); };
    await assert.rejects(verifyUploadedImage(fullId), /not found/);
    cloudinary.api.resource = async () => ({ public_id: "wrong", resource_type: "image", bytes: 1024, width: 1920, height: 1440, format: "jpeg", version: 1 });
    await assert.rejects(verifyUploadedImage(fullId), /imagen esperada/);
    cloudinary.api.resource = async (id) => ({ public_id: id, resource_type: "image", bytes: 2048, width: 1920, height: 1440, format: "jpeg", version: 5 });
    assert.deepEqual(await verifyUploadedImage(fullId), { width: 1920, height: 1440, mime: "image/jpeg", sizeKb: 2, version: 5 });
  } finally { cloudinary.api.resource = original; }
});
