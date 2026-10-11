CREATE TABLE IF NOT EXISTS upload_authorizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token VARCHAR(64) UNIQUE NOT NULL,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  upload_session_id UUID NOT NULL REFERENCES upload_sessions(id) ON DELETE CASCADE,
  table_qr_id UUID REFERENCES table_qrs(id) ON DELETE SET NULL,
  public_id VARCHAR(255) NOT NULL,
  signed_at BIGINT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'reserved',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  consumed_at TIMESTAMPTZ,
  CHECK (status IN ('reserved', 'consumed', 'released'))
);
CREATE INDEX IF NOT EXISTS idx_upload_authorizations_session ON upload_authorizations(upload_session_id, status);
CREATE INDEX IF NOT EXISTS idx_upload_authorizations_table ON upload_authorizations(table_qr_id, status);
CREATE INDEX IF NOT EXISTS idx_upload_authorizations_expiry ON upload_authorizations(expires_at, status);
ALTER TABLE photos ADD COLUMN IF NOT EXISTS authorization_id UUID REFERENCES upload_authorizations(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_photos_authorization ON photos(authorization_id) WHERE authorization_id IS NOT NULL;
