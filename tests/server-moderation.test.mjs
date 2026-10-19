import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { classifyNsfw } from "../lib/server-moderation.ts";

test("server classifier runs the bundled model locally and fails closed on invalid images", async () => {
  const image = await sharp({ create: { width: 224, height: 224, channels: 3, background: "#fafafa" } }).png().toBuffer();
  const score = await classifyNsfw(image);
  assert.equal(typeof score, "number");
  assert.ok(Number.isFinite(score) && score >= 0 && score <= 1);
  assert.equal(await classifyNsfw(Buffer.from("invalid image")), null);
});
