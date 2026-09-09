import { notFound } from "next/navigation";
import { getEvent } from "@/lib/event-data";
import { sql } from "@/lib/db";
import { GalleryGrid, type GalleryPhoto } from "@/components/GalleryGrid";

export const dynamic = "force-dynamic";

type Props = PageProps<"/[slug]/galeria">;

// Galería post-reveal: solo se ve si pasó reveal_at y no quedan pendientes.
export default async function GalleryPage({ params }: Props) {
  const { slug } = await params;
  const event = getEvent(slug);
  if (!event) return notFound();

  const events = (await sql`
    SELECT reveal_at FROM events WHERE slug = ${slug} LIMIT 1
  `) as { reveal_at: string | null }[];

  const revealAt = events[0]?.reveal_at ? new Date(events[0].reveal_at) : null;
  const now = new Date();

  const pending = (await sql`
    SELECT count(*) AS n FROM photos p
    JOIN events e ON e.id = p.event_id
    WHERE e.slug = ${slug} AND p.status = 'pending'
  `) as { n: string }[];

  const open =
    revealAt !== null && now >= revealAt && Number(pending[0]?.n ?? 1) === 0;

  if (!open) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
        <h1
          className="font-serif text-4xl text-ink sm:text-5xl"
          style={{ textWrap: "balance" }}
        >
          Las fotos se revelan pronto
        </h1>
        <p className="max-w-md text-base leading-relaxed text-ink/70 sm:text-lg">
          {revealAt
            ? `El ${revealAt.toLocaleDateString("es-AR", { day: "numeric", month: "long" })} vas a poder ver todas las fotos de la fiesta.`
            : "Cuando el organizador lo decida, las fotos aparecerán acá."}
        </p>
      </div>
    );
  }

  const photos = (await sql`
    SELECT id, cloudinary_url, thumbnail_url FROM photos p
    JOIN events e ON e.id = p.event_id
    WHERE e.slug = ${slug} AND p.status = 'approved'
    ORDER BY created_at ASC
  `) as GalleryPhoto[];

  return (
    <div className="mx-auto min-h-dvh max-w-5xl px-4 py-10 sm:px-6">
      <h1
        className="mb-8 text-center font-serif text-4xl text-ink sm:text-5xl"
        style={{ textWrap: "balance" }}
      >
        Galería
      </h1>
      <GalleryGrid photos={photos} />
    </div>
  );
}
