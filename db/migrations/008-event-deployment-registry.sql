-- Permite varios eventos en la misma base, uno por slug, clon y subdominio.
ALTER TABLE events ADD COLUMN IF NOT EXISTS deployment_id VARCHAR(128);
ALTER TABLE events ADD COLUMN IF NOT EXISTS hostname VARCHAR(255);
DROP INDEX IF EXISTS events_single_installation;
CREATE UNIQUE INDEX IF NOT EXISTS events_deployment_id_unique ON events(deployment_id) WHERE deployment_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS events_hostname_unique ON events(lower(hostname)) WHERE hostname IS NOT NULL;
