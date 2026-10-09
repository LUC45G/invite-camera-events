import assert from "node:assert/strict";
import test from "node:test";
import { installationState, selectInstallationEvent } from "../lib/event-selection.ts";

test("una instalación vacía no inventa un evento", () => {
  assert.equal(selectInstallationEvent([]), null);
  assert.equal(installationState(null), "empty");
});

test("conserva la identidad del evento sin modificarlo", () => {
  const event = Object.freeze({ id: "event-1", slug: "otro-slug" });
  assert.equal(selectInstallationEvent([event]), event);
  assert.equal(installationState(event), "configured");
});

test("distingue una configuración pendiente de una terminada", () => {
  assert.equal(installationState({ setup_complete: false }), "pending");
  assert.equal(installationState({ setup_complete: true }), "configured");
});

test("no elige arbitrariamente un evento si hay más de uno", () => {
  assert.throws(() => selectInstallationEvent([{ id: "a" }, { id: "b" }]), /un solo evento/);
});
