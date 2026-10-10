import { notFound } from "next/navigation";
import { getEvent } from "@/lib/event-data";
import { CameraUploader } from "@/components/CameraUploader";

type Props = PageProps<"/[slug]/upload">;

export default async function UploadPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const event = getEvent(slug);
  if (!event) return notFound();

  const query = await searchParams;
  const qr = typeof query.qr === "string" ? query.qr : "";

  if (!qr) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="font-serif text-4xl text-ink" style={{ textWrap: "balance" }}>
          Escaneá el QR de tu familia
        </h1>
        <p className="text-base text-ink/70 sm:text-lg">
          Usá el código QR de tu familia para cargar fotos.
        </p>
      </div>
    );
  }

  return <CameraUploader slug={slug} qr={qr} />;
}
