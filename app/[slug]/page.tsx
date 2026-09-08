import { notFound } from "next/navigation";
import { getEvent } from "@/lib/event-data";
import { findRsvp, isTokenValid } from "@/lib/rsvp-store";
import { RSVPForm } from "@/components/RSVPForm";
import { SplitSection } from "@/components/SplitSection";
import { Reveal } from "@/components/Reveal";
import { Countdown } from "@/components/Countdown";

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

  return (
    <div className="snap-container">
      {/* 1. Hero */}
      <section className="flex min-h-dvh snap-start flex-col items-center justify-center px-6 text-center">
        <Reveal>
          <p className="font-sans text-sm tracking-[0.3em] text-bronze uppercase sm:text-base">
            Nos casamos
          </p>
          <h1 className="mt-4 font-serif text-5xl leading-[1.1] text-ink sm:text-7xl" style={{ textWrap: "balance" }}>
            {event.coupleNames}
          </h1>
          <p className="mt-4 font-sans text-lg text-ink/70 sm:text-xl">
            {event.date}
          </p>
          <div className="mt-8">
            <Countdown target={event.weddingTimestamp} />
          </div>
          <a
            href="#rsvp"
            className="mt-10 inline-block rounded-sm bg-bronze px-8 py-3 text-base text-ivory transition-colors hover:bg-bronze/90 sm:text-lg"
          >
            Confirmar invitación
          </a>
        </Reveal>
      </section>

      {/* 2. Nuestra historia — foto izquierda (65%), texto derecha (35%) */}
      <SplitSection image={event.story.image} alt="Nosotros">
        <Reveal>
          <h2 className="font-serif text-4xl text-ink sm:text-5xl" style={{ textWrap: "balance" }}>
            {event.story.heading}
          </h2>
          {event.story.paragraphs.map((p) => (
            <p
              key={p.slice(0, 24)}
              className="mt-3 text-base leading-relaxed text-ink/75 sm:text-lg"
            >
              {p}
            </p>
          ))}
        </Reveal>
      </SplitSection>

      {/* 3. Ceremonia y festejo — texto izquierda, foto derecha (65%) */}
      <SplitSection image={event.heroImage} alt="Ceremonia" reverse>
        <Reveal>
          <h2 className="font-serif text-4xl text-ink sm:text-5xl" style={{ textWrap: "balance" }}>
            Ceremonia y festejo
          </h2>
          <p className="mt-3 text-base leading-relaxed text-ink/75 sm:text-lg">
            {event.venue}
            <br />
            {event.venueAddress}
          </p>
          <a
            href={event.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block border-b border-ink/20 pb-0.5 text-base text-bronze transition-colors hover:border-bronze sm:text-lg"
          >
            Cómo llegar
          </a>
        </Reveal>
      </SplitSection>

      {/* 4. FAQ */}
      <section className="flex min-h-dvh snap-start flex-col items-center justify-center px-6">
        <Reveal>
          <div className="max-w-lg text-center">
            <h2 className="font-serif text-4xl text-ink sm:text-5xl" style={{ textWrap: "balance" }}>Preguntas</h2>
            <div className="mt-6 flex flex-col gap-5 text-left">
              <div>
                <h3 className="font-sans text-sm tracking-[0.2em] text-bronze uppercase">
                  Código de vestimenta
                </h3>
                <p className="mt-1 text-base leading-relaxed text-ink/75 sm:text-lg">
                  Elegante. Evitar color blanco o beige.
                </p>
              </div>
              <div>
                <h3 className="font-sans text-sm tracking-[0.2em] text-bronze uppercase">
                  Horario
                </h3>
                <p className="mt-1 text-base leading-relaxed text-ink/75 sm:text-lg">
                  La ceremonia empieza a las {event.time}. Llegar 10 minutos antes.
                </p>
              </div>
              <div>
                <h3 className="font-sans text-sm tracking-[0.2em] text-bronze uppercase">
                  Estacionamiento
                </h3>
                <p className="mt-1 text-base leading-relaxed text-ink/75 sm:text-lg">
                  El salón tiene estacionamiento propio.
                </p>
              </div>
              <div>
                <h3 className="font-sans text-sm tracking-[0.2em] text-bronze uppercase">
                  Niños
                </h3>
                <p className="mt-1 text-base leading-relaxed text-ink/75 sm:text-lg">
                  La fiesta es solo para adultos.
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* 5. RSVP */}
      <section id="rsvp" className="flex min-h-dvh snap-start flex-col items-center justify-center px-6">
        <Reveal>
          <div className="w-full max-w-md">
            {!hasToken ? (
              <p className="text-center text-base leading-relaxed text-ink/75 sm:text-lg">
                Confirmá tu asistencia desde el link que te enviamos.
              </p>
            ) : !tokenValid ? (
              <p className="text-center text-base leading-relaxed text-ink/75 sm:text-lg">
                Este link no es válido. Revisá el mensaje que te enviamos.
              </p>
            ) : existing ? (
              <div className="flex flex-col gap-2">
                <h2 className="text-center font-serif text-4xl text-ink sm:text-5xl" style={{ textWrap: "balance" }}>
                  Ya confirmaste tu asistencia
                </h2>
                <p className="text-center text-base leading-relaxed text-ink/75 sm:text-lg">
                  {existing.name} —{" "}
                  {existing.status === "accepted"
                    ? `vas con ${existing.guests} ${existing.guests === 1 ? "persona" : "personas"}`
                    : "no vas a poder ir"}
                  {existing.dietary ? <> · {existing.dietary}</> : null}
                </p>
                <p className="text-center text-sm text-ink/55 sm:text-base">
                  Cualquier cambio, comunicate con {event.contactName} al{" "}
                  {event.contactPhone}.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <h2 className="text-center font-serif text-4xl text-ink sm:text-5xl" style={{ textWrap: "balance" }}>
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
        </Reveal>
      </section>
    </div>
  );
}
