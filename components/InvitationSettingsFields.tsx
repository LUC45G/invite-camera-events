"use client";

import { renderInvitationMessage } from "@/lib/invitation-message";

export function InvitationSettingsFields({ message, contact, onMessage, onContact, previewName, previewLink, disabled = false }: {
  message: string;
  contact: string;
  onMessage: (value: string) => void;
  onContact: (value: string) => void;
  previewName: string;
  previewLink: string;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <div>
        <label className="flex flex-col gap-2 text-sm">
          Mensaje para copiar
          <textarea
            required
            maxLength={4000}
            rows={6}
            value={message}
            disabled={disabled}
            onChange={(e) => onMessage(e.target.value)}
            className="w-full rounded-sm border border-ink/20 bg-ivory p-3 text-base"
          />
        </label>
        <p className="mt-2 text-xs text-ink/70">
          Usá {"{nombre}"} para la familia y {"{link}"} para su invitación. El enlace es obligatorio.
        </p>
      </div>
      <div className="rounded-sm border border-ink/15 bg-ivory p-3">
        <p className="mb-2 text-sm text-ink/60">Vista previa · {previewName}</p>
        <p className="whitespace-pre-wrap break-words text-sm">
          {renderInvitationMessage(message, previewName, previewLink)}
        </p>
      </div>
      <label className="flex flex-col gap-2 text-sm lg:col-span-2">
        Contacto para cambios de invitación
        <input
          type="text"
          required
          maxLength={2048}
          value={contact}
          disabled={disabled}
          onChange={(e) => onContact(e.target.value)}
          className="w-full rounded-sm border border-ink/20 bg-ivory p-3 text-base"
        />
      </label>
      <p className="text-xs text-ink/70 lg:col-span-2">
        Usá un enlace HTTPS al repositorio o mailto:tu@email.com. Si necesitás editar la información, comunicate.
      </p>
    </div>
  );
}
