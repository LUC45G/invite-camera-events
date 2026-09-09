"use client";

import { useEffect, useState } from "react";
import { getSnapContainer, smoothScrollTo } from "@/lib/scroll";

export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const container = getSnapContainer();
    if (!container) return;

    const onScroll = () => setVisible(container.scrollTop > container.clientHeight);
    onScroll();
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      aria-label="Volver arriba"
      onClick={() => {
        const container = getSnapContainer();
        if (container) smoothScrollTo(container, 0);
      }}
      className={`fixed bottom-6 right-6 z-50 rounded-sm bg-bronze px-4 py-3 text-sm text-ivory transition-opacity duration-300 hover:bg-bronze/90 ${
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      ↑
    </button>
  );
}
