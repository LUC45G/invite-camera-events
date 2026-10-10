"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const browserOrigin = () => window.location.origin;
const serverOrigin = () => "";

export function useBrowserOrigin() {
  return useSyncExternalStore(subscribe, browserOrigin, serverOrigin);
}
