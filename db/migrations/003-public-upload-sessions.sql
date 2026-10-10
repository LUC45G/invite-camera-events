ALTER TABLE upload_sessions ALTER COLUMN table_qr_id DROP NOT NULL;
-- statement-breakpoint
ALTER TABLE upload_sessions ADD COLUMN IF NOT EXISTS access_mode TEXT NOT NULL DEFAULT 'invitations';
-- statement-breakpoint
ALTER TABLE upload_sessions DROP CONSTRAINT IF EXISTS upload_sessions_mode_family;
-- statement-breakpoint
ALTER TABLE upload_sessions ADD CONSTRAINT upload_sessions_mode_family CHECK (
  (access_mode = 'invitations' AND table_qr_id IS NOT NULL) OR
  (access_mode = 'public_qr' AND table_qr_id IS NULL)
);
