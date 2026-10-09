-- Non-destructive and repeatable. Existing events require admin confirmation.
ALTER TABLE events ADD COLUMN IF NOT EXISTS access_mode TEXT NOT NULL DEFAULT 'invitations' CHECK (access_mode IN ('invitations', 'public_qr'));
-- statement-breakpoint
ALTER TABLE events ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ;
-- statement-breakpoint
ALTER TABLE events ADD COLUMN IF NOT EXISTS upload_starts_at TIMESTAMPTZ;
-- statement-breakpoint
ALTER TABLE events ADD COLUMN IF NOT EXISTS upload_ends_at TIMESTAMPTZ;
-- statement-breakpoint
ALTER TABLE events ADD COLUMN IF NOT EXISTS setup_complete BOOLEAN NOT NULL DEFAULT false;
-- statement-breakpoint
ALTER TABLE events ADD COLUMN IF NOT EXISTS deletion_pending BOOLEAN NOT NULL DEFAULT false;
-- statement-breakpoint
ALTER TABLE events ADD COLUMN IF NOT EXISTS public_qr_token VARCHAR(64) UNIQUE;
-- statement-breakpoint
ALTER TABLE table_qrs ADD COLUMN IF NOT EXISTS photo_count INT NOT NULL DEFAULT 0;
-- statement-breakpoint
UPDATE table_qrs t SET photo_count = GREATEST(
  t.photo_count,
  (SELECT count(*)::int FROM photos p WHERE p.table_qr_id = t.id),
  (SELECT COALESCE(sum(s.photo_count), 0)::int FROM upload_sessions s WHERE s.table_qr_id = t.id)
);
