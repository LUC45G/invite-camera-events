"use client";

import { useEffect, useState } from "react";
import {
  addScrollListener,
  getScrollHost,
  getScrollTop,
  getViewportHeight,
  smoothScrollTo,
} from "@/lib/scroll";

export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const host = getScrollHost();
    const onScroll = () =>
      setVisible(getScrollTop(host) > getViewportHeight(host));
    onScroll();
    return addScrollListener(host, onScroll);
  }, []);

  return (
    <button
      type="button"
      aria-label="Volver arriba"
      onClick={() => {
        smoothScrollTo(getScrollHost(), 0);
      }}
      className={`fixed bottom-6 right-6 z-50 rounded-sm bg-bronze px-4 py-3 text-sm text-ivory transition-opacity duration-300 hover:bg-bronze/90 ${
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      ↑
    </button>
  );
}
