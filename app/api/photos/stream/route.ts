import {
  emitter,
  PHOTO_ADDED_EVENT,
  PHOTOS_CHANGED_EVENT,
  SLIDESHOW_EVENT,
} from "@/lib/sse";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// SSE: notifica fotos nuevas y controles de slideshow a pantallas /live.
// Eventos: connected, new_photos, slideshow, heartbeat (15s).
export async function GET(request: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;

      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
          );
        } catch {
          closed = true;
        }
      };

      send("connected", { ok: true });

      const onPhoto = (photo: unknown) => send("new_photos", photo);
      emitter.on(PHOTO_ADDED_EVENT, onPhoto);

      const onPhotosChanged = (change: unknown) =>
        send("photos_changed", change);
      emitter.on(PHOTOS_CHANGED_EVENT, onPhotosChanged);

      const onControl = (control: unknown) => send("slideshow", control);
      emitter.on(SLIDESHOW_EVENT, onControl);

      const heartbeat = setInterval(
        () => send("heartbeat", { t: Date.now() }),
        15000,
      );

      request.signal.addEventListener("abort", () => {
        closed = true;
        emitter.off(PHOTO_ADDED_EVENT, onPhoto);
        emitter.off(PHOTOS_CHANGED_EVENT, onPhotosChanged);
        emitter.off(SLIDESHOW_EVENT, onControl);
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          // ya cerrado
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
