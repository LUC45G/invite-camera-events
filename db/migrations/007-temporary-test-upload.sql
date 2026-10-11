CREATE TABLE IF NOT EXISTS upload_test_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  token VARCHAR(64) UNIQUE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  CHECK (status IN ('active', 'completed', 'cancelled', 'cleanup_pending'))
);
CREATE INDEX IF NOT EXISTS idx_upload_test_runs_event ON upload_test_runs(event_id, status);

ALTER TABLE upload_sessions ADD COLUMN IF NOT EXISTS test_run_id UUID REFERENCES upload_test_runs(id) ON DELETE CASCADE;
ALTER TABLE upload_authorizations ADD COLUMN IF NOT EXISTS test_run_id UUID REFERENCES upload_test_runs(id) ON DELETE CASCADE;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS test_run_id UUID REFERENCES upload_test_runs(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_upload_sessions_test_run ON upload_sessions(test_run_id);
CREATE INDEX IF NOT EXISTS idx_upload_authorizations_test_run ON upload_authorizations(test_run_id, status);
CREATE INDEX IF NOT EXISTS idx_photos_test_run ON photos(test_run_id);
