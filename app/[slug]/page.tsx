import { notFound } from "next/navigation";
import { getEvent } from "@/lib/event-data";
import { findRsvp, isTokenValid } from "@/lib/rsvp-store";
import { RSVPForm } from "@/components/RSVPForm";
import { Slideshow } from "@/components/Slideshow";
import { Countdown } from "@/components/Countdown";
import { ScrollToRsvp } from "@/components/ScrollToRsvp";

type Props = PageProps<"/[slug]">;

export default async function Page({ params, searchParams }: Props) {
  const { slug } = await params;
  const event = getEvent(slug);
  if (!event) return notFound();

  const query = await searchParams;
  const token = typeof query.token === "string" ? query.token : "";
  const hasToken = token.length > 0;
  const tokenValid = hasToken && isTokenValid(token);
  const existing = tokenValid ? findRsvp(token) : undefined;

  const slides = [
    {
      image: event.story.image,
      alt: "Nosotros",
      heading: event.story.heading,
      paragraphs: event.story.paragraphs,
    },
    {
      image: event.heroImage,
      alt: "Ceremonia",
      heading: "Ceremonia y festejo",
      paragraphs: [
        `${event.venue} — ${event.venueAddress}`,
        `Vestimenta: ${event.dressCode}`,
      ],
    },
    {
      image: event.faq.image,
      alt: "FAQ",
      heading: event.faq.heading,
      paragraphs: event.faq.paragraphs,
    },
  ];

  return (
    <main className="snap-y snap-mandatory overflow-y-auto">
      {/* Hero */}
      <section className="flex min-h-dvh snap-start flex-col items-center justify-center px-6 text-center">
        <p className="font-sans text-sm tracking-[0.3em] text-bronze uppercase sm:text-base">
          Nos casamos
        </p>
        <h1
          className="mt-3 font-serif text-5xl leading-[1.1] text-ink sm:text-7xl"
          style={{ textWrap: "balance" }}
        >
          {event.coupleNames}
        </h1>
        <p className="mt-3 font-sans text-lg text-ink/70 sm:text-xl">
          {event.date}
        </p>
        <div className="mt-5">
          <Countdown target={event.weddingTimestamp} />
        </div>
        <ScrollToRsvp>
          <span className="mt-8 inline-block rounded-sm bg-bronze px-8 py-3 text-base text-ivory transition-colors hover:bg-bronze/90 sm:text-lg">
            Confirmar invitación
          </span>
        </ScrollToRsvp>
      </section>

      {/* Slideshow — polaroid izq + texto der */}
      <Slideshow slides={slides} />

      {/* RSVP */}
      <section
        id="rsvp"
        className="flex min-h-dvh snap-start flex-col items-center justify-center px-6"
      >
        <div className="w-full max-w-md">
          {!hasToken ? (
            <p className="text-center text-lg leading-relaxed text-ink/75 sm:text-xl">
              Confirmá tu asistencia desde el link que te enviamos.
            </p>
          ) : !tokenValid ? (
            <p className="text-center text-lg leading-relaxed text-ink/75 sm:text-xl">
              Este link no es válido. Revisá el mensaje que te enviamos.
            </p>
          ) : existing ? (
            <div className="flex flex-col gap-2">
              <h2
                className="text-center font-serif text-4xl text-ink sm:text-5xl"
                style={{ textWrap: "balance" }}
              >
                Ya confirmaste tu asistencia
              </h2>
              <p className="text-center text-lg leading-relaxed text-ink/75 sm:text-xl">
                {existing.name} —{" "}
                {existing.status === "accepted"
                  ? `vas con ${existing.guests} ${existing.guests === 1 ? "persona" : "personas"}`
                  : "no vas a poder ir"}
                {existing.dietary ? <> · {existing.dietary}</> : null}
              </p>
              <p className="text-center text-base text-ink/55 sm:text-lg">
                Cualquier cambio, comunicate con {event.contactName} al{" "}
                {event.contactPhone}.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <h2
                className="text-center font-serif text-4xl text-ink sm:text-5xl"
                style={{ textWrap: "balance" }}
              >
                Confirmá tu asistencia
              </h2>
              <RSVPForm
                token={token}
                contactName={event.contactName}
                contactPhone={event.contactPhone}
              />
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
