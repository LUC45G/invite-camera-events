import { z } from "zod";

export const EVENT_TIME_ZONE = "America/Argentina/Buenos_Aires";

export function eventSchedule(startsAt: string) {
  const start = new Date(startsAt);
  if (Number.isNaN(start.getTime())) throw new Error("Inicio del evento inválido");
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: EVENT_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(start);
  const opens = new Date(`${day}T12:00:00-03:00`);
  return {
    upload_starts_at: opens.toISOString(),
    upload_ends_at: new Date(opens.getTime() + 24 * 60 * 60 * 1000).toISOString(),
    min_reveal_at: new Date(opens.getTime() + 48 * 60 * 60 * 1000).toISOString(),
  };
}

export const retainedSetupSchema = z.object({
  starts_at: z.string().datetime({ offset: true }),
  reveal_at: z.string().datetime({ offset: true }),
}).strict().refine((data) => {
  return new Date(data.reveal_at) >= new Date(eventSchedule(data.starts_at).min_reveal_at);
}, { message: "El reveal debe ser desde las 12:00 del segundo día posterior al evento", path: ["reveal_at"] });

export function argentinaInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: EVENT_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

export function argentinaInstant(value: string) {
  return new Date(`${value}:00-03:00`).toISOString();
}
