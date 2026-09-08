import { notFound } from "next/navigation";
import { getEvent } from "@/lib/event-data";
import { findRsvp, isTokenValid } from "@/lib/rsvp-store";
import { RSVPForm } from "@/components/RSVPForm";
import { Section } from "@/components/Section";

type Props = PageProps<"/[slug]">;

export default async function Page({ params, searchParams }: Props) {
  const { slug } = await params;
  const event = getEvent(slug);
  if (!event) return notFound();

  const query = await searchParams;
  const token =
    typeof query.token === "string" ? query.token : "";
  const hasToken = token.length > 0;
  const tokenValid = hasToken && isTokenValid(token);
  const existing = tokenValid ? findRsvp(token) : undefined;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-10 px-6 py-16 sm:py-20">
      <header className="flex flex-col items-center gap-4 text-center">
        <p className="font-sans text-sm tracking-[0.25em] text-bronze uppercase">
          Nos casamos
        </p>
        <h1 className="font-serif text-5xl leading-[1.1] text-ink sm:text-6xl">
          {event.coupleNames}
        </h1>
        <p className="font-sans text-lg text-ink/70">
          {event.date} · {event.time}
        </p>
      </header>

      <Section>
        <h2 className="font-serif text-2xl text-ink">Ceremonia y festejo</h2>
        <p className="mt-3 text-base leading-relaxed text-ink/75">
          {event.venue}
          <br />
          {event.venueAddress}
        </p>
        <p className="mt-2 text-base leading-relaxed text-ink/75">
          Vestimenta: {event.dressCode}
        </p>
        <a
          href={event.mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-block border-b border-bronze/60 pb-0.5 text-base text-bronze transition-colors hover:border-bronze"
        >
          Cómo llegar
        </a>
      </Section>

      <Section>
        <h2 className="font-serif text-2xl text-ink">Cómo funciona</h2>
        <p className="mt-3 text-base leading-relaxed text-ink/75">
          Durante la fiesta vas a encontrar un código QR en tu mesa.
          Escanealo con el celular, sacá fotos y se van proyectando en vivo en
          las pantallas del salón. No hace falta descargar ninguna app.
        </p>
      </Section>

      <Section>
        {!hasToken ? (
          <p className="text-base leading-relaxed text-ink/75">
            Confirmá tu asistencia desde el link que te enviamos.
          </p>
        ) : !tokenValid ? (
          <p className="text-base leading-relaxed text-ink/75">
            Este link de confirmación no es válido. Revisá el mensaje que te
            enviamos.
          </p>
        ) : existing ? (
          <div className="flex flex-col gap-2">
            <h2 className="font-serif text-2xl text-ink">
              Ya confirmaste tu asistencia
            </h2>
            <p className="text-base leading-relaxed text-ink/75">
              {existing.name} —{" "}
              {existing.status === "accepted"
                ? `vas con ${existing.guests} ${existing.guests === 1 ? "persona" : "personas"}`
                : "no vas a poder ir"}
              {existing.dietary ? <> · {existing.dietary}</> : null}
            </p>
            <p className="text-sm text-ink/55">
              Cualquier cambio, comunicate con {event.contactName} al{" "}
              {event.contactPhone}.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <h2 className="font-serif text-2xl text-ink">
              Confirmá tu asistencia
            </h2>
            <RSVPForm
              token={token}
              contactName={event.contactName}
              contactPhone={event.contactPhone}
            />
          </div>
        )}
      </Section>
    </main>
  );
}
