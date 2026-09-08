-- Schema: QR Wedding
-- Ejecutar una vez en Neon (SQL Editor) antes del primer deploy.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Evento
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  reveal_at TIMESTAMPTZ,
  max_photos_per_session INT DEFAULT 24,
  projection_enabled BOOLEAN DEFAULT true,
  slideshow_interval INT DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Invitados (identificados via link personalizado)
CREATE TABLE IF NOT EXISTS guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  token VARCHAR(64) UNIQUE NOT NULL,
  name VARCHAR(100),
  rsvp_status VARCHAR(20) DEFAULT 'pending',
  rsvp_guests INT DEFAULT 1,
  rsvp_responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- QR por mesa (uno por mesa, varios invitados lo usan)
CREATE TABLE IF NOT EXISTS table_qrs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  table_number INT NOT NULL,
  qr_token VARCHAR(64) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Fotos
CREATE TABLE IF NOT EXISTS photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  table_qr_id UUID REFERENCES table_qrs(id) ON DELETE SET NULL,
  cloudinary_public_id VARCHAR(255) NOT NULL,
  cloudinary_url TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  original_width INT,
  original_height INT,
  status VARCHAR(20) DEFAULT 'pending',
  nsfw_score FLOAT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_photos_event ON photos(event_id);
CREATE INDEX IF NOT EXISTS idx_photos_status ON photos(status);
CREATE INDEX IF NOT EXISTS idx_guests_event ON guests(event_id);
