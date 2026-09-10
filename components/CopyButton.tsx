"use client";

import { useState } from "react";

type Props = {
  text: string;
  className?: string;
  children: React.ReactNode;
};

// Botón que copia texto al portapapeles y confirma con "¡Copiado!".
export function CopyButton({ text, className, children }: Props) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("error");
    }
    setTimeout(() => setState("idle"), 2000);
  }

  return (
    <button type="button" onClick={copy} className={className}>
      {state === "copied" ? "¡Copiado!" : state === "error" ? "Error al copiar" : children}
    </button>
  );
}
