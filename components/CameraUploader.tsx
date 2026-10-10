"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Props = { slug: string; qr: string; accessMode: "invitations" | "public_qr" };

type Phase = "starting" | "confirm" | "locked" | "camera" | "preview" | "uploading" | "done";

const SESSION_KEY = "upload_session_token";

export function CameraUploader({ slug, qr, accessMode }: Props) {
  const router = useRouter();
  const storageKey = `${SESSION_KEY}:${slug}:${accessMode}`;
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [phase, setPhase] = useState<Phase>("starting");
  const [error, setError] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [nsfwScore, setNsfwScore] = useState<number | null>(null);
  const [tableNumber, setTableNumber] = useState<number | null>(null);
  const [tableName, setTableName] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function postSession(body: Record<string, unknown>) {
    const res = await fetch("/api/upload/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, slug, accessMode }),
    });
    const data = await res.json().catch(() => ({}));
    return { res, data } as {
      res: Response;
      data: {
        error?: string;
        rsvpRequired?: boolean;
        confirm?: boolean;
        sessionToken?: string;
        remaining?: number;
        tableNumber?: number;
        tableName?: string;
        lockedTable?: { tableNumber: number | null; tableName: string };
      };
    };
  }

  async function startLinkedSession(token: string) {
    const { res, data } = await postSession({ qr, sessionToken: token });
    if (!res.ok) {
      if (data.rsvpRequired) {
        redirectToInvitation();
        return;
      }
      if (res.status === 409 && data.lockedTable) {
        setTableNumber(data.lockedTable.tableNumber);
        setTableName(data.lockedTable.tableName);
        setPhase("locked");
        return;
      }
      setError(data.error ?? "QR inválido");
      setPhase("done");
      return;
    }
    localStorage.setItem(storageKey, data.sessionToken!);
    setSessionToken(data.sessionToken!);
    setRemaining(data.remaining ?? null);
    setTableNumber(data.tableNumber ?? null);
    setTableName(data.tableName ?? null);
    await startCamera();
  }

  // Familia sin RSVP aceptado: vuelve a la invitación con aviso, sin cámara.
  function redirectToInvitation() {
    if (accessMode === "invitations") router.replace(`/${slug}?token=${qr}&notice=camera-blocked`);
  }

  // reanudar sesión ligada, o pedir confirmación de vinculación si es nueva
  useEffect(() => {
    (async () => {
      const stored = localStorage.getItem(storageKey) ?? (accessMode === "invitations" ? localStorage.getItem(`${SESSION_KEY}:${slug}`) : null);
      try {
        if (stored) {
          await startLinkedSession(stored);
          return;
        }
        const { res, data } = await postSession({ qr });
        if (!res.ok) {
          if (data.rsvpRequired) {
            redirectToInvitation();
            return;
          }
          setError(data.error ?? "QR inválido");
          setPhase("done");
          return;
        }
        setTableNumber(data.tableNumber ?? null);
        setTableName(data.tableName ?? null);
        if (accessMode === "public_qr" && data.sessionToken) {
          localStorage.setItem(storageKey, data.sessionToken);
          setSessionToken(data.sessionToken);
          setRemaining(data.remaining ?? null);
          await startCamera();
        } else setPhase("confirm");
      } catch {
        setError("No hay conexión. Probá de nuevo.");
        setPhase("done");
      }
    })();

    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qr, slug, accessMode]);

  // El usuario acepta vincular este dispositivo a la familia.
  async function confirmLink() {
    setConfirming(true);
    try {
      const { res, data } = await postSession({ qr, confirmed: true });
      if (!res.ok) {
        if (data.rsvpRequired) {
          redirectToInvitation();
          return;
        }
        setError(data.error ?? "No se pudo vincular");
        setPhase("done");
        return;
      }
      localStorage.setItem(storageKey, data.sessionToken!);
      setSessionToken(data.sessionToken!);
      setRemaining(data.remaining ?? null);
      setTableNumber(data.tableNumber ?? null);
      setTableName(data.tableName ?? null);
      await startCamera();
    } catch {
      setError("No hay conexión. Probá de nuevo.");
      setPhase("done");
    } finally {
      setConfirming(false);
    }
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1440 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setPhase("camera");
    } catch {
      setError("No se pudo abrir la cámara. Verificá permisos del navegador.");
      setPhase("done");
    }
  }

  // capturar frame → blob comprimido (~4:3, máx 1920 ancho)
  const capture = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    // Normalizar a 4:3 con crop centrado
    const targetRatio = 4 / 3;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    let sw = vw;
    let sh = Math.round(vw / targetRatio);
    if (sh > vh) {
      sh = vh;
      sw = Math.round(vh * targetRatio);
    }
    const sx = Math.round((vw - sw) / 2);
    const sy = Math.round((vh - sh) / 2);

    const maxW = 1920;
    const w = Math.min(sw, maxW);
    const h = Math.round((w / 4) * 3);
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, w, h);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          streamRef.current?.getTracks().forEach((t) => t.stop());
          setPreviewBlob(blob);
          setNsfwScore(null);
          setPhase("preview");
          // NSFW en paralelo, sin bloquear: el modelo se carga bajo demanda
          classifyNsfw(canvas);
        }
      },
      "image/jpeg",
      0.82,
    );
  }, []);

  // Clasifica la captura con nsfwjs. Nunca bloquea la subida: si el modelo
  // falla o tarda, el score queda null y la foto entra como pendiente normal.
  async function classifyNsfw(canvas: HTMLCanvasElement) {
    try {
      const nsfw = await import("nsfwjs").then((m) => m.load());
      const predictions = await Promise.race([
        nsfw.classify(canvas),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), 12000),
        ),
      ]);
      const bad = predictions.find(
        (p) => p.className === "Porn" || p.className === "Hentai" || p.className === "Sexy",
      );
      setNsfwScore(bad ? bad.probability : 0);
    } catch {
      setNsfwScore(null);
    }
  }

  // subir la foto: sign → Cloudinary → complete
  async function upload(blob: Blob, score: number | null) {
    if (!sessionToken) return;
    setUploading(true);
    setError(null);

    try {
      const signRes = await fetch("/api/upload/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken }),
      });
      const sign = await signRes.json();
      if (!signRes.ok) throw new Error(sign.error ?? "No se pudo firmar la subida");

      const form = new FormData();
      form.append("file", blob);
      form.append("api_key", sign.apiKey);
      form.append("timestamp", String(sign.timestamp));
      form.append("signature", sign.signature);
      form.append("folder", sign.folder);

      const cloudRes = await fetch(
        `https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`,
        { method: "POST", body: form },
      );
      if (!cloudRes.ok) throw new Error("Cloudinary rechazó la subida");
      const cloud = await cloudRes.json();

      const completeRes = await fetch("/api/upload/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionToken,
          publicId: cloud.public_id,
          width: cloud.width,
          height: cloud.height,
          mime: "image/jpeg",
          sizeKb: Math.round(cloud.bytes / 1024),
          nsfwScore: score ?? undefined,
        }),
      });
      const complete = await completeRes.json();
      if (!completeRes.ok) throw new Error(complete.error ?? "No se pudo registrar la foto");

      setRemaining(typeof sign.remaining === "number" ? sign.remaining - 1 : null);
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al subir la foto");
      // reanudar cámara para reintentar
      startCamera();
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-cream">
      <header className="flex items-center justify-between px-6 py-4">
        {accessMode === "invitations" ? <Link
          href={`/${slug}`}
          className="font-sans text-sm tracking-[0.2em] text-bronze uppercase"
        >
          ← Invitación
        </Link> : <span className="font-sans text-sm tracking-[0.2em] text-bronze uppercase">Fotos del evento</span>}
        {tableNumber !== null ? (
          <span className="font-sans text-xs tracking-[0.2em] text-ink/55 uppercase">
            Familia {tableNumber}
            {remaining !== null ? ` · ${remaining} restantes` : ""}
          </span>
        ) : (
          remaining !== null && (
            <span className="font-sans text-xs tracking-[0.2em] text-ink/55 uppercase">
              {remaining} restantes
            </span>
          )
        )}
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 pb-10">
        {phase === "starting" && (
          <p className="font-sans text-base text-ink/55">Abriendo cámara…</p>
        )}

        {phase === "confirm" && (
          <div className="flex max-w-[400px] flex-col items-center gap-4 text-center">
            <h1 className="font-serif text-4xl text-ink" style={{ textWrap: "balance" }}>
              ¿Vincularse a la {tableName ?? `familia ${tableNumber ?? ""}`}?
            </h1>
            <div className="w-full text-left">
              <h2 className="font-sans text-sm tracking-[0.2em] text-bronze uppercase">
                ¿Cómo funciona?
              </h2>
              <ol className="mt-3 flex flex-col gap-2 text-base leading-relaxed text-ink/70 sm:text-lg">
                <li className="flex gap-3">
                  <span className="font-serif text-xl text-bronze">1.</span>
                  <span>Sacá la foto, confirmá y subí.</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-serif text-xl text-bronze">2.</span>
                  <span>Tu límite de fotos va a estar visible todo el tiempo.</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-serif text-xl text-bronze">3.</span>
                  <span>Las fotos se van a proyectar en la pantalla.</span>
                </li>
              </ol>
              <p className="mt-3 text-sm leading-relaxed text-ink/55 sm:text-base">
                Pueden tardar unos segundos en aparecer.
              </p>
            </div>
            <p className="text-base text-ink/70 sm:text-lg">
              Este dispositivo va a quedar ligado a esta familia durante toda la
              fiesta para subir sus fotos.
            </p>
            <div className="flex gap-3">
              <Link
                href={`/${slug}`}
                className="rounded-sm border border-ink/20 bg-ivory px-6 py-3 text-lg text-ink transition-colors hover:border-ink/40"
              >
                No
              </Link>
              <button
                type="button"
                disabled={confirming}
                aria-busy={confirming}
                onClick={confirmLink}
                className="rounded-sm bg-bronze px-8 py-3 text-lg text-ivory transition-colors hover:bg-bronze/90 disabled:opacity-60"
              >
                {confirming ? "Vinculando…" : "Sí, vincular"}
              </button>
            </div>
          </div>
        )}

        {phase === "locked" && (
          <div className="flex max-w-[400px] flex-col items-center gap-3 text-center">
            <h1 className="font-serif text-4xl text-ink" style={{ textWrap: "balance" }}>
              Dispositivo ya vinculado
            </h1>
            <p className="text-base text-ink/70 sm:text-lg">
              Este dispositivo está ligado a la {tableName ?? `familia ${tableNumber ?? ""}`}.
              Pedí el QR de tu familia para subir fotos.
            </p>
            <Link
              href={`/${slug}`}
              className="mt-2 rounded-sm bg-bronze px-8 py-3 text-lg text-ivory transition-colors hover:bg-bronze/90"
            >
              Volver a la invitación
            </Link>
          </div>
        )}

        {/* Video en vivo */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full max-w-[400px] rounded-sm border border-ink/10 object-cover ${phase === "camera" || phase === "starting" ? "block" : "hidden"}`}
        />

        {/* Preview 4:3 */}
        {phase === "preview" && previewBlob && (
          <img
            src={URL.createObjectURL(previewBlob)}
            alt="Preview de la foto"
            className="w-full max-w-[400px] rounded-sm border border-ink/10"
          />
        )}

        {phase === "camera" && (
          <button
            type="button"
            onClick={capture}
            className="rounded-sm bg-bronze px-8 py-3 text-lg text-ivory transition-colors hover:bg-bronze/90"
          >
            Sacar foto
          </button>
        )}

        {phase === "preview" && (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setPreviewBlob(null);
                startCamera();
              }}
              className="rounded-sm border border-ink/20 bg-ivory px-4 py-2.5 text-lg text-ink transition-colors hover:border-ink/40"
            >
              Descartar
            </button>
            <button
              type="button"
              disabled={uploading || !previewBlob}
              aria-busy={uploading}
              onClick={() => previewBlob && upload(previewBlob, nsfwScore)}
              className="rounded-sm bg-bronze px-8 py-3 text-lg text-ivory transition-colors hover:bg-bronze/90 disabled:opacity-60"
            >
              {uploading ? "Subiendo…" : "Subir"}
            </button>
          </div>
        )}

        {phase === "starting" && !error && (
          <p className="font-sans text-sm text-ink/55">Preparando subida…</p>
        )}

        {error && (
          <p role="alert" className="text-center text-base text-ink/80">
            {error}
          </p>
        )}

        {phase === "done" && !error && (
          <div className="flex max-w-[400px] flex-col items-center gap-3 text-center">
            <h1 className="font-serif text-4xl text-ink" style={{ textWrap: "balance" }}>
              ¡Foto subida!
            </h1>
            <p className="text-base text-ink/70 sm:text-lg">
              Aparecerá en las pantallas del salón en unos segundos.
            </p>
            <button
              type="button"
              onClick={() => {
                setPreviewBlob(null);
                startCamera();
              }}
              className="mt-4 rounded-sm bg-bronze px-8 py-3 text-lg text-ivory transition-colors hover:bg-bronze/90"
            >
              Sacar otra
            </button>
          </div>
        )}
      </main>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
