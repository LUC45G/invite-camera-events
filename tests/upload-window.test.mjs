import assert from "node:assert/strict";
import test from "node:test";
const { getUploadWindowState } = await import("../lib/upload-window.ts");

const event = { upload_starts_at: "2026-11-05T15:00:00.000Z", upload_ends_at: "2026-11-06T15:00:00.000Z", upload_open: true };

test("la ventana usa apertura inclusiva y cierre exclusivo", () => {
  assert.equal(getUploadWindowState(event, new Date("2026-11-05T14:59:59.999Z")).status, "before");
  assert.equal(getUploadWindowState(event, new Date("2026-11-05T15:00:00.000Z")).status, "available");
  assert.equal(getUploadWindowState(event, new Date("2026-11-06T14:59:59.999Z")).status, "available");
  assert.equal(getUploadWindowState(event, new Date("2026-11-06T15:00:00.000Z")).status, "finished");
});

test("la pausa solo bloquea nuevas cargas durante la ventana", () => {
  const paused = getUploadWindowState({ ...event, upload_open: false }, new Date("2026-11-05T16:00:00.000Z"));
  assert.equal(paused.status, "paused");
  assert.equal(paused.canStartNewUpload, false);
  assert.equal(paused.canTogglePause, true);
  const finished = getUploadWindowState({ ...event, upload_open: false }, new Date("2026-11-06T15:00:00.000Z"));
  assert.equal(finished.status, "finished");
  assert.equal(finished.canTogglePause, false);
});
