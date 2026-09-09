"use client";

import { useState } from "react";

export function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Error de login");
        return;
      }
      window.location.reload();
    } catch {
      setError("Error de conexión");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6">
      <form onSubmit={onSubmit} className="w-full max-w-[300px] sm:w-[360px]">
        <h1 className="font-serif text-3xl text-center text-ink" style={{ textWrap: "balance" }}>
          Panel de admin
        </h1>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña"
          required
          className="mt-6 w-full rounded-sm border border-ink/20 bg-ivory px-3 py-2.5 text-lg text-ink focus:border-bronze"
        />
        {error && (
          <p role="alert" className="mt-3 text-center text-base text-ink/80">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className="mt-4 w-full rounded-sm bg-bronze px-4 py-3 text-lg text-ivory transition-colors hover:bg-bronze/90 disabled:opacity-60"
        >
          {pending ? "Ingresando…" : "Ingresar"}
        </button>
      </form>
    </div>
  );
}
