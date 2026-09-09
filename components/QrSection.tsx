"use client";

import { useEffect, useState } from "react";

type QrTable = { table_number: number; qr_token: string };

export function QrSection({ slug }: { slug: string }) {
  const [tables, setTables] = useState<QrTable[] | null>(null);

  useEffect(() => {
    fetch("/api/admin/tables")
      .then((r) => r.json())
      .then((d: { tables?: QrTable[] }) => setTables(d.tables ?? []))
      .catch(() => setTables([]));
  }, []);

  if (!tables) return null;

  const base = typeof window !== "undefined" ? window.location.origin : "";
  const qrUrl = (token: string) => `${base}/${slug}/upload?qr=${token}`;
  const inviteUrl = (token: string) => `${base}/${slug}?token=${token}`;

  async function downloadQr(table_number: number, token: string) {
    const QRCode = await import("qrcode");
    const url = await QRCode.toDataURL(qrUrl(token), {
      width: 512,
      margin: 2,
    });
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-mesa-${table_number}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <section className="mb-8 rounded-sm border border-ink/10 bg-ivory p-4">
      <h2 className="font-sans text-xs tracking-[0.2em] text-bronze uppercase">
        QRs e invitaciones ({tables.length} mesas)
      </h2>
      <div className="mt-3 flex flex-col gap-2">
        {tables.map((t) => (
          <div
            key={t.table_number}
            className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-ink/10 px-3 py-2"
          >
            <div className="min-w-0">
              <p className="font-sans text-base text-ink">Mesa {t.table_number}</p>
              <p className="truncate font-mono text-xs text-ink/55">
                {inviteUrl(t.qr_token)}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(inviteUrl(t.qr_token));
                }}
                className="rounded-sm border border-ink/20 px-3 py-1.5 text-sm text-ink"
              >
                Copiar link
              </button>
              <button
                type="button"
                onClick={() => downloadQr(t.table_number, t.qr_token)}
                className="rounded-sm bg-bronze px-3 py-1.5 text-sm text-ivory"
              >
                QR mesa
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
