import { notFound } from "next/navigation";
import { getEvent } from "@/lib/event-data";
import { findRsvp, isTokenValid } from "@/lib/rsvp-db";
import { RSVPForm } from "@/components/RSVPForm";
import { SplitSection } from "@/components/SplitSection";
import { Reveal } from "@/components/Reveal";
import { Countdown } from "@/components/Countdown";
import { BackToTop } from "@/components/BackToTop";
import { ScrollDots } from "@/components/ScrollDots";
import { Stagger } from "@/components/Stagger";
import { FaqItem } from "@/components/FaqItem";
import { Timeline } from "@/components/Timeline";
import { SectionDecor } from "@/components/SectionDecor";

type Props = PageProps<"/[slug]">;

export default async function Page({ params, searchParams }: Props) {
  const { slug } = await params;
  const event = getEvent(slug);
  if (!event) return notFound();

  const query = await searchParams;
  const token = typeof query.token === "string" ? query.token : "";
  const hasToken = token.length > 0;
  const tokenValid = hasToken && (await isTokenValid(token));
  const existing = tokenValid ? await findRsvp(token) : undefined;
  const cameraBlocked = query.notice === "camera-blocked";

  return (
    <div className="snap-container">
      {/* 1. Hero */}
      <section className="flex min-h-dvh snap-start flex-col items-center justify-center px-6 text-center">
        {cameraBlocked && (
          <p
            role="alert"
            className="mb-6 max-w-md rounded-sm border border-bronze bg-bronze/10 px-4 py-3 font-sans text-base text-ink"
          >
            Para usar la cámara de tu mesa, primero confirmá tu asistencia acá abajo.
          </p>
        )}
        <Stagger delay={0}>
          <p className="font-sans text-sm tracking-[0.3em] text-bronze uppercase">
            Nos casamos
          </p>
        </Stagger>
        <Stagger delay={150}>
          <h1 className="mt-4 font-serif leading-[1.1] text-ink" style={{ textWrap: "balance", fontSize: "clamp(3rem, 8vw, 4.5rem)" }}>
            {event.coupleNames}
          </h1>
        </Stagger>
        <Stagger delay={300}>
          <p className="mt-4 font-sans text-lg text-ink/70 sm:text-xl">
            {event.date}
          </p>
        </Stagger>
        <Stagger delay={450}>
          <div className="mt-8">
            <Countdown target={event.weddingTimestamp} />
          </div>
        </Stagger>
        <Stagger delay={600}>
          <a
            href="#rsvp"
            className="mt-10 inline-block rounded-sm bg-bronze px-8 py-3 text-base text-ivory transition-colors hover:bg-bronze/90 sm:text-lg"
          >
            Confirmar asistencia
          </a>
        </Stagger>
      </section>

      {/* 2. Nuestra historia — foto izquierda (65%), texto derecha (35%) */}
      <SplitSection image={event.story.image} alt="Nosotros" decor={event.decor.history}>
        <Reveal>
          <Stagger delay={0}>
            <h2 className="font-serif text-4xl text-ink sm:text-5xl" style={{ textWrap: "balance" }}>
              {event.story.heading}
            </h2>
          </Stagger>
          <Stagger delay={200}>
            <div>
              {event.story.paragraphs.map((p) => (
                <p
                  key={p.slice(0, 24)}
                  className="mt-3 text-base leading-relaxed text-ink/70 sm:text-lg"
                >
                  {p}
                </p>
              ))}
            </div>
          </Stagger>
        </Reveal>
      </SplitSection>

      {/* 3. Cronograma — línea de tiempo vertical */}
      <section className="relative flex min-h-dvh snap-start flex-col items-center justify-center overflow-hidden px-6">
        <SectionDecor items={event.decor.schedule} />
        <div className="relative z-20 w-full">
          <Reveal>
            <Stagger delay={0}>
              <h2 className="text-center font-serif text-4xl text-ink sm:text-5xl" style={{ textWrap: "balance" }}>
                Cronograma
              </h2>
            </Stagger>
            <div className="mt-8 w-full">
              <Timeline items={event.schedule} />
            </div>
          </Reveal>
        </div>
      </section>

      {/* 4. Ceremonia y festejo — texto izquierda, foto derecha (65%) */}
      <SplitSection image={event.heroImage} alt="Ceremonia" reverse decor={event.decor.ceremony}>
        <Reveal>
          <Stagger delay={0}>
            <h2 className="font-serif text-4xl text-ink sm:text-5xl" style={{ textWrap: "balance" }}>
              Ceremonia y festejo
            </h2>
          </Stagger>
          <Stagger delay={200}>
            <div>
              <p className="mt-3 text-base leading-relaxed text-ink/70 sm:text-lg">
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
            </div>
          </Stagger>
        </Reveal>
      </SplitSection>

      {/* 5. FAQ */}
      <section className="flex min-h-dvh snap-start flex-col items-center justify-center px-6">
        <div className="w-[300px] sm:w-[400px]">
          <Reveal>
            <h2 className="font-serif text-4xl text-ink sm:text-5xl" style={{ textWrap: "balance" }}>Preguntas</h2>
          </Reveal>
          <div className="mt-6 flex flex-col gap-0 text-left">
            {[
              { q: "Código de vestimenta", a: "Elegante. Evitar color blanco o beige." },
              { q: "Horario", a: `La ceremonia empieza a las ${event.time}. Llegar 10 minutos antes.` },
              { q: "Estacionamiento", a: "El salón tiene estacionamiento propio." },
              { q: "Niños", a: "La fiesta es solo para adultos." },
            ].map((faq, i) => (
              <Stagger key={faq.q} delay={150 + i * 150}>
                <FaqItem question={faq.q} answer={faq.a} />
              </Stagger>
            ))}
          </div>
        </div>
      </section>

      {/* 6. RSVP */}
      <section id="rsvp" className="flex min-h-dvh snap-start flex-col items-center justify-center px-6">
        <Reveal>
          <div className="w-[300px] sm:w-[400px]">
            <Stagger delay={0}>
              <h2 className="text-center font-serif text-4xl text-ink sm:text-5xl" style={{ textWrap: "balance" }}>
                {existing ? "Ya confirmaste tu asistencia" : "Confirmá tu asistencia"}
              </h2>
            </Stagger>
            <Stagger delay={200}>
              <div className={existing ? "flex flex-col gap-2" : "flex flex-col gap-4"}>
                {!hasToken ? (
              <p className="text-center text-base leading-relaxed text-ink/70 sm:text-lg">
                Confirmá tu asistencia desde el link que te enviamos.
              </p>
            ) : !tokenValid ? (
              <p className="text-center text-base leading-relaxed text-ink/70 sm:text-lg">
                Este link no es válido. Revisá el mensaje que te enviamos.
              </p>
            ) : existing ? (
              <div className="flex flex-col gap-2">
                <p className="text-center text-base leading-relaxed text-ink/70 sm:text-lg">
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
                <RSVPForm
                  token={token}
                  contactName={event.contactName}
                  contactPhone={event.contactPhone}
                />
              </div>
            )}
              </div>
            </Stagger>
          </div>
        </Reveal>
      </section>
      <ScrollDots />
      <BackToTop />
    </div>
  );
}

