ALTER TABLE events ADD COLUMN IF NOT EXISTS invitation_message TEXT;
-- statement-breakpoint
ALTER TABLE events ADD COLUMN IF NOT EXISTS invitation_contact TEXT;
-- statement-breakpoint
UPDATE events SET
  invitation_message = COALESCE(invitation_message, $template$Hola {nombre}! 💒

Daniela & Miguel se casan y queremos que seas parte.
Confirmá tu asistencia acá: {link}

¡Te esperamos!$template$),
  invitation_contact = COALESCE(invitation_contact, 'https://github.com/LUC45G/invite-camera-events')
WHERE access_mode = 'invitations';
