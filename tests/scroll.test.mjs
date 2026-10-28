import assert from "node:assert/strict";
import test from "node:test";
import { smoothScrollTo } from "../lib/scroll.ts";

test("navigation delegates to native scrolling and honors reduced motion", (t) => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  let reduced = false;
  const calls = [];
  const host = { scrollTo: (options) => calls.push(options) };
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      matchMedia(query) {
        assert.equal(query, "(prefers-reduced-motion: reduce)");
        return { matches: reduced };
      },
    },
  });
  t.after(() => {
    if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
    else delete globalThis.window;
  });

  smoothScrollTo(host, 1200);
  smoothScrollTo(host, 2400);
  reduced = true;
  smoothScrollTo(host, 0);
  assert.deepEqual(calls, [
    { top: 1200, behavior: "smooth" },
    { top: 2400, behavior: "smooth" },
    { top: 0, behavior: "instant" },
  ]);
});
