import { notFound } from "next/navigation";
import { getEventBySlug } from "@/lib/upload-db";
import { sql } from "@/lib/db";
import { GalleryGrid, type GalleryPhoto } from "@/components/GalleryGrid";

export const dynamic = "force-dynamic";

type Props = PageProps<"/[slug]/galeria">;

// Galería post-reveal: solo fotos aprobadas del evento, sin pruebas.
export default async function GalleryPage({ params }: Props) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event || !event.setup_complete || event.deletion_pending) return notFound();
  const revealAt = event.reveal_at ? new Date(event.reveal_at) : null;
  const now = new Date();

  const open = revealAt !== null && now >= revealAt;

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
    SELECT p.id, p.cloudinary_url, p.thumbnail_url FROM photos p
    JOIN events e ON e.id = p.event_id
    WHERE p.event_id = ${event.id} AND p.status = 'approved' AND p.test_run_id IS NULL
    ORDER BY p.created_at ASC
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
