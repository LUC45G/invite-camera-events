"use client";

import { useCallback, useEffect, useState } from "react";

type AdminRsvpRow = {
  table_number: number | null;
  name: string | null;
  rsvp_status: string;
  rsvp_guests: number;
  rsvp_dietary: string | null;
  rsvp_responded_at: string | null;
};

type AdminRsvpSummary = {
  total: number;
  pending: number;
  accepted: number;
  declined: number;
  confirmedPeople: number;
  dietary: string[];
};

type EventSettings = {
  name: string;
  slug: string;
  reveal_at: string | null;
  upload_open: boolean;
  projection_enabled: boolean;
  slideshow_interval: number;
  max_photos_per_session: number;
};

type StorageMetric = { usage: number | null; limit: number | null };

type StorageData = {
  cloud: {
    objects: StorageMetric;
    storage: StorageMetric;
    bandwidth: StorageMetric;
    requests: StorageMetric;
    transformations: StorageMetric;
  } | null;
  cloudError: string | null;
  db: {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
    totalKb: number;
    lastUpload: string | null;
  };
};

const WIPE_CONFIRMATION = "BORRAR TODO";

function formatBytes(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  if (value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(
    units.length - 1,
    Math.floor(Math.log(value) / Math.log(1024)),
  );
  const scaled = value / 1024 ** index;
  return `${scaled >= 100 ? Math.round(scaled) : scaled.toFixed(1)} ${units[index]}`;
}

function metricText(metric: StorageMetric, inBytes = false): string {
  if (metric.usage === null) return "—";
  const used = inBytes ? formatBytes(metric.usage) : metric.usage.toLocaleString("es-AR");
  if (metric.limit === null) return used;
  const limit = inBytes ? formatBytes(metric.limit) : metric.limit.toLocaleString("es-AR");
  return `${used} / ${limit}`;
}

function metricPercent(metric: StorageMetric): number | null {
  if (metric.usage === null || metric.limit === null || metric.limit <= 0) {
    return null;
  }
  return Math.min(100, Math.round((metric.usage / metric.limit) * 100));
}

function toLocalInput(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const part = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${part(date.getMonth() + 1)}-${part(date.getDate())}T${part(date.getHours())}:${part(date.getMinutes())}`;
}

type AdminRequestState<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

function requestError(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function useAdminRequest<T>(fetcher: () => Promise<T>): AdminRequestState<T> {
  const [state, setState] = useState<Omit<AdminRequestState<T>, "refresh">>({
    data: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    fetcher()
      .then((data) => {
        if (!cancelled) setState({ data, error: null, loading: false });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState((previous) => ({
            ...previous,
            error: requestError(error, "No se pudo cargar"),
            loading: false,
          }));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [fetcher]);

  const refresh = useCallback(async () => {
    setState((previous) => ({ ...previous, loading: true, error: null }));
    try {
      const data = await fetcher();
      setState({ data, error: null, loading: false });
    } catch (error) {
      setState((previous) => ({
        ...previous,
        error: requestError(error, "No se pudo cargar"),
        loading: false,
      }));
    }
  }, [fetcher]);

  return { ...state, refresh };
}

function rsvpStatusLabel(status: string): string {
  if (status === "accepted") return "Confirmada";
  if (status === "declined") return "Rechazada";
  return "Pendiente";
}

export function AdminRsvpPanel({ slug }: { slug: string }) {
  const fetchRsvp = useCallback(async (): Promise<{
    guests: AdminRsvpRow[];
    summary: AdminRsvpSummary | null;
  }> => {
    const res = await fetch(`/api/admin/rsvp?slug=${slug}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "No se pudo cargar RSVP");
    return { guests: data.guests ?? [], summary: data.summary ?? null };
  }, [slug]);

  const { data, error, loading, refresh } = useAdminRequest(fetchRsvp);
  const rows = data?.guests ?? [];
  const summary = data?.summary ?? null;

  return (
    <section className="mb-8 rounded-sm border border-ink/10 bg-ivory p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-sans text-xs tracking-[0.2em] text-bronze uppercase">
          Invitados y RSVP
        </h2>
        <button
          type="button"
          onClick={() => {
            void refresh();
          }}
          disabled={loading}
          className="rounded-sm border border-ink/20 px-3 py-1.5 text-sm text-ink disabled:opacity-60"
        >
          {loading ? "Actualizando…" : "Actualizar"}
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-3 font-sans text-sm text-ink/80">
          {error}
        </p>
      )}

      {summary && (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-sm border border-ink/10 px-3 py-2">
            <p className="font-serif text-2xl text-ink">{summary.accepted}</p>
            <p className="font-sans text-xs text-ink/55">familias confirmadas</p>
          </div>
          <div className="rounded-sm border border-ink/10 px-3 py-2">
            <p className="font-serif text-2xl text-ink">{summary.confirmedPeople}</p>
            <p className="font-sans text-xs text-ink/55">personas confirmadas</p>
          </div>
          <div className="rounded-sm border border-ink/10 px-3 py-2">
            <p className="font-serif text-2xl text-ink">{summary.pending}</p>
            <p className="font-sans text-xs text-ink/55">pendientes</p>
          </div>
          <div className="rounded-sm border border-ink/10 px-3 py-2">
            <p className="font-serif text-2xl text-ink">{summary.declined}</p>
            <p className="font-sans text-xs text-ink/55">rechazadas</p>
          </div>
        </div>
      )}

      {summary && summary.dietary.length > 0 && (
        <p className="mt-3 font-sans text-sm text-ink/70">
          Restricciones: {summary.dietary.join(" · ")}
        </p>
      )}

      <div className="mt-3 max-h-96 overflow-y-auto rounded-sm border border-ink/10">
        <table className="w-full text-left font-sans text-sm">
          <thead className="sticky top-0 bg-ivory">
            <tr className="text-xs tracking-[0.12em] text-ink/55 uppercase">
              <th className="px-3 py-2">Mesa</th>
              <th className="px-3 py-2">Familia</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Personas</th>
              <th className="px-3 py-2">Restricciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.table_number ?? "sin-mesa"}-${row.name ?? "sin-nombre"}`} className="border-t border-ink/10">
                <td className="px-3 py-2">{row.table_number ?? "—"}</td>
                <td className="px-3 py-2">{row.name ?? "—"}</td>
                <td className="px-3 py-2">{rsvpStatusLabel(row.rsvp_status)}</td>
                <td className="px-3 py-2">{row.rsvp_guests}</td>
                <td className="px-3 py-2">{row.rsvp_dietary?.trim() || "—"}</td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-ink/55">
                  No hay invitados cargados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

type EventForm = {
  revealLocal: string;
  uploadOpen: boolean;
  projectionEnabled: boolean;
  maxPhotos: number;
};

export function AdminEventSettings({ slug }: { slug: string }) {
  const fetchEvent = useCallback(async (): Promise<{ event: EventSettings }> => {
    const res = await fetch(`/api/admin/event?slug=${slug}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "No se pudo cargar el evento");
    return { event: data.event as EventSettings };
  }, [slug]);

  const { data, error: loadError, refresh } = useAdminRequest(fetchEvent);
  const [draft, setDraft] = useState<EventForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const form: EventForm = draft ?? {
    revealLocal: toLocalInput(data?.event.reveal_at ?? null),
    uploadOpen: data?.event.upload_open ?? true,
    projectionEnabled: data?.event.projection_enabled ?? true,
    maxPhotos: data?.event.max_photos_per_session ?? 24,
  };

  function updateForm(patch: Partial<EventForm>) {
    setDraft({ ...form, ...patch });
    setSaved(false);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          reveal_at: form.revealLocal ? new Date(form.revealLocal).toISOString() : null,
          upload_open: form.uploadOpen,
          projection_enabled: form.projectionEnabled,
          max_photos_per_session: form.maxPhotos,
        }),
      });
      const response = await res.json();
      if (!res.ok) throw new Error(response.error ?? "No se pudo guardar");
      setDraft(null);
      await refresh();
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mb-8 rounded-sm border border-ink/10 bg-ivory p-4">
      <h2 className="font-sans text-xs tracking-[0.2em] text-bronze uppercase">
        Evento y reveal
      </h2>
      {data?.event && (
        <p className="mt-1 font-sans text-sm text-ink/55">
          {data.event.name} · /{data.event.slug}
        </p>
      )}
      {loadError && (
        <p role="alert" className="mt-1 font-sans text-sm text-ink/80">
          {loadError}
        </p>
      )}
      <form onSubmit={save} className="mt-3 flex flex-col gap-3">
        <label className="flex flex-col gap-1 font-sans text-sm text-ink/70">
          Fecha y hora de reveal
          <input
            type="datetime-local"
            value={form.revealLocal}
            onChange={(e) => updateForm({ revealLocal: e.target.value })}
            className="rounded-sm border border-ink/20 bg-ivory px-3 py-2 text-base text-ink"
          />
        </label>
        <label className="flex items-center gap-2 font-sans text-sm text-ink/70">
          <input
            type="checkbox"
            checked={form.uploadOpen}
            onChange={(e) => updateForm({ uploadOpen: e.target.checked })}
            className="h-4 w-4 accent-[#B57E7F]"
          />
          Subida abierta
        </label>
        <label className="flex items-center gap-2 font-sans text-sm text-ink/70">
          <input
            type="checkbox"
            checked={form.projectionEnabled}
            onChange={(e) => updateForm({ projectionEnabled: e.target.checked })}
            className="h-4 w-4 accent-[#B57E7F]"
          />
          Proyección habilitada
        </label>
        <label className="flex flex-col gap-1 font-sans text-sm text-ink/70">
          Límite de fotos por mesa
          <input
            type="number"
            min={1}
            max={100}
            value={form.maxPhotos}
            onChange={(e) => updateForm({ maxPhotos: Number(e.target.value) })}
            className="w-28 rounded-sm border border-ink/20 bg-ivory px-3 py-2 text-base text-ink [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
          />
        </label>
        {error && (
          <p role="alert" className="font-sans text-sm text-ink/80">
            {error}
          </p>
        )}
        {saved && (
          <p className="font-sans text-sm text-ink/70">Cambios guardados.</p>
        )}
        <div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-sm bg-bronze px-4 py-2 text-sm text-ivory transition-colors hover:bg-bronze/90 disabled:opacity-60"
          >
            {saving ? "Guardando…" : "Guardar evento"}
          </button>
        </div>
      </form>
    </section>
  );
}

export function AdminStoragePanel({ slug }: { slug: string }) {
  const fetchStorage = useCallback(async (): Promise<StorageData> => {
    const res = await fetch(`/api/admin/storage?slug=${slug}`);
    const payload = await res.json();
    if (!res.ok) throw new Error(payload.error ?? "No se pudo cargar almacenamiento");
    return payload as StorageData;
  }, [slug]);

  const { data, error, loading, refresh } = useAdminRequest(fetchStorage);

  const storagePercent = data ? metricPercent(data.cloud?.storage ?? { usage: null, limit: null }) : null;

  return (
    <section className="mb-8 rounded-sm border border-ink/10 bg-ivory p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-sans text-xs tracking-[0.2em] text-bronze uppercase">
          Almacenamiento
        </h2>
        <button
          type="button"
          onClick={() => {
            void refresh();
          }}
          className="rounded-sm border border-ink/20 px-3 py-1.5 text-sm text-ink"
        >
          Actualizar
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-3 font-sans text-sm text-ink/80">
          {error}
        </p>
      )}

      {data && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-sm border border-ink/10 px-3 py-2">
            <p className="font-sans text-xs tracking-[0.12em] text-ink/55 uppercase">
              Cloudinary
            </p>
            <p className="mt-1 font-sans text-sm text-ink">
              {metricText(data.cloud?.storage ?? { usage: null, limit: null }, true)}
            </p>
            {storagePercent !== null && (
              <div className="mt-2 h-1.5 overflow-hidden rounded-sm bg-ink/10">
                <div className="h-full bg-bronze" style={{ width: `${storagePercent}%` }} />
              </div>
            )}
            <p className="mt-2 font-sans text-xs text-ink/55">
              Recursos: {metricText(data.cloud?.objects ?? { usage: null, limit: null })} · Ancho de
              banda: {metricText(data.cloud?.bandwidth ?? { usage: null, limit: null }, true)}
            </p>
            {data.cloudError && (
              <p className="mt-2 font-sans text-xs text-ink/70">{data.cloudError}</p>
            )}
          </div>
          <div className="rounded-sm border border-ink/10 px-3 py-2">
            <p className="font-sans text-xs tracking-[0.12em] text-ink/55 uppercase">
              Base de datos
            </p>
            <p className="mt-1 font-sans text-sm text-ink">
              {data.db.total} fotos · {formatBytes(data.db.totalKb * 1024)}
            </p>
            <p className="mt-2 font-sans text-xs text-ink/55">
              {data.db.approved} aprobadas · {data.db.pending} pendientes · {data.db.rejected}{" "}
              rechazadas
            </p>
            <p className="mt-1 font-sans text-xs text-ink/55">
              Última subida:{" "}
              {data.db.lastUpload
                ? new Date(data.db.lastUpload).toLocaleString("es-AR")
                : "—"}
            </p>
          </div>
        </div>
      )}
      {loading && !data && (
        <p className="mt-3 font-sans text-sm text-ink/55">Cargando almacenamiento…</p>
      )}
    </section>
  );
}

export function AdminDangerPanel({ slug }: { slug: string }) {
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function wipe() {
    if (busy || confirmation !== WIPE_CONFIRMATION) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/wipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, confirmation }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo borrar");
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo borrar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mb-8 rounded-sm border border-ink/20 bg-ivory p-4">
      <h2 className="font-sans text-xs tracking-[0.2em] text-bronze uppercase">
        Zona peligrosa
      </h2>
      {!done ? (
        <>
          <p className="mt-2 font-sans text-sm text-ink/70">
            Borra todas las fotos de Cloudinary y todos los datos del evento. Primero
            descargá el ZIP. Esta acción no se puede deshacer.
          </p>
          <label className="mt-3 flex flex-col gap-1 font-sans text-sm text-ink/70">
            Escribí {WIPE_CONFIRMATION} para confirmar
            <input
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              placeholder={WIPE_CONFIRMATION}
              className="rounded-sm border border-ink/20 bg-ivory px-3 py-2 text-base text-ink"
            />
          </label>
          {error && (
            <p role="alert" className="mt-2 font-sans text-sm text-ink/80">
              {error}
            </p>
          )}
          <div className="mt-3">
            <button
              type="button"
              onClick={wipe}
              disabled={busy || confirmation !== WIPE_CONFIRMATION}
              className="rounded-sm bg-ink/80 px-4 py-2 text-sm text-ivory disabled:opacity-60"
            >
              {busy ? "Borrando…" : "Borrar todo"}
            </button>
          </div>
        </>
      ) : (
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <p className="font-sans text-sm text-ink/70">
            Borrado completo. Recargá el panel para ver el estado vacío.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-sm border border-ink/20 px-4 py-2 text-sm text-ink"
          >
            Recargar
          </button>
        </div>
      )}
    </section>
  );
}
