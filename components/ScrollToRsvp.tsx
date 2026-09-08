"use client";

import { useCallback } from "react";

export function ScrollToRsvp({ children }: { children: React.ReactNode }) {
  const scroll = useCallback(() => {
    document.getElementById("rsvp")?.scrollIntoView({ behavior: "smooth" });
  }, []);

  return (
    <button type="button" onClick={scroll}>
      {children}
    </button>
  );
}
