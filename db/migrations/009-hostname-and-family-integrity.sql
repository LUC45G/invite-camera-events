DROP INDEX IF EXISTS events_hostname_unique;
CREATE UNIQUE INDEX events_hostname_unique ON events(lower(hostname)) WHERE hostname IS NOT NULL;
UPDATE events SET hostname = lower(hostname) WHERE hostname IS DISTINCT FROM lower(hostname);
CREATE UNIQUE INDEX IF NOT EXISTS table_qrs_event_number_unique ON table_qrs(event_id, table_number);

-- A fixed baseline for uploads made before authorizations existed.
ALTER TABLE table_qrs ADD COLUMN IF NOT EXISTS legacy_photo_count INT;
UPDATE table_qrs t SET legacy_photo_count = GREATEST(
  (SELECT count(*) FROM photos p WHERE p.table_qr_id = t.id AND p.authorization_id IS NULL),
  t.photo_count,
  (SELECT COALESCE(sum(s.photo_count), 0) FROM upload_sessions s WHERE s.table_qr_id = t.id)
) WHERE legacy_photo_count IS NULL;
ALTER TABLE table_qrs ALTER COLUMN legacy_photo_count SET DEFAULT 0;
ALTER TABLE table_qrs ALTER COLUMN legacy_photo_count SET NOT NULL;
