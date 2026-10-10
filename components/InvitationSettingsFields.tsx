"use client";

import { invitationContactSchema, renderInvitationMessage } from "@/lib/invitation-message";

export function InvitationSettingsFields({ message, contact, onMessage, onContact, previewName, previewLink, disabled = false }: {
  message: string; contact: string; onMessage: (value: string) => void; onContact: (value: string) => void;
  previewName: string; previewLink: string; disabled?: boolean;
}) {
  const safeContact = invitationContactSchema.safeParse(contact);
  return <div className="flex flex-col gap-4">
    <label className="flex flex-col gap-2">Mensaje para copiar
      <textarea required maxLength={4000} rows={7} value={message} disabled={disabled} onChange={(e) => onMessage(e.target.value)} className="w-full rounded-sm border border-ink/20 bg-ivory p-3 text-base" />
    </label>
    <p className="text-sm text-ink/70">Usá {"{nombre}"} para la familia y {"{link}"} para su invitación. El enlace es obligatorio. Los nombres de la pareja se escriben en el mensaje; el nombre interno del evento no los reemplaza.</p>
    <div className="rounded-sm border border-ink/15 bg-ivory p-3">
      <p className="mb-2 text-sm text-ink/60">Vista previa · {previewName}</p>
      <p className="whitespace-pre-wrap break-words text-sm">{renderInvitationMessage(message, previewName, previewLink)}</p>
    </div>
    <label className="flex flex-col gap-2">Contacto para cambios de invitación
      <input type="text" required maxLength={2048} value={contact} disabled={disabled} onChange={(e) => onContact(e.target.value)} className="w-full rounded-sm border border-ink/20 bg-ivory p-3 text-base" />
    </label>
    <p className="text-sm text-ink/70">Usá un enlace HTTPS al repositorio o mailto:tu@email.com.</p>
    <p className="text-sm text-ink/70">Si necesitás editar la información de las invitaciones, comunicate. {safeContact.success && <a href={safeContact.data} target="_blank" rel="noopener noreferrer" className="text-bronze underline">Contactar</a>}</p>
  </div>;
}
