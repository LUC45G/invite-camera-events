import { z } from "zod";

export const DEFAULT_INVITATION_MESSAGE = `Hola {nombre}! 💒

Daniela & Miguel se casan y queremos que seas parte.
Confirmá tu asistencia acá: {link}

¡Te esperamos!`;
export const DEFAULT_INVITATION_CONTACT = "https://github.com/LUC45G/invite-camera-events";

export const invitationMessageSchema = z.string().max(4000).refine((value) => value.trim().length > 0, "Escribí un mensaje de invitación")
  .refine((value) => value.includes("{link}"), "El mensaje debe incluir {link} para enlazar la invitación")
  .refine((value) => [...value.matchAll(/\{([^{}]*)\}/g)].every((match) => ["nombre", "link"].includes(match[1])), "Las variables disponibles son {nombre} y {link}");

export const invitationContactSchema = z.string().trim().min(1).max(2048).refine((value) => {
  if (/[\u0000-\u0020\u007f]/.test(value)) return false;
  try {
    const url = new URL(value);
    if (url.protocol === "https:") return !!url.hostname && !url.username && !url.password;
    return url.protocol === "mailto:" && /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(decodeURIComponent(url.pathname));
  } catch { return false; }
}, "Usá un enlace HTTPS o mailto válido para el contacto");

export const invitationSettingsSchema = z.object({
  invitation_message: invitationMessageSchema,
  invitation_contact: invitationContactSchema,
}).strict();

export function familyInvitationLink(origin: string, slug: string, token: string) {
  return `${origin}/${encodeURIComponent(slug)}?token=${encodeURIComponent(token)}`;
}

// One replacement pass: a name containing braces is always literal family data.
export function renderInvitationMessage(template: string, name: string, link: string) {
  return template.replace(/\{(nombre|link)\}/g, (_, variable: string) => variable === "nombre" ? name : link);
}
