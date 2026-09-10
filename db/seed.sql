-- Seed: QR Wedding
-- Editar las variables de la primera sección antes de ejecutar en Neon (SQL Editor).

-- ===== CONFIGURACIÓN (editar) =====
-- \set event_name 'Boda Sofía & Mateo'
-- \set event_slug 'nuestra-boda'
-- \set reveal_at '2026-09-12 23:59:00-03'
-- \set num_tables 10

INSERT INTO events (name, slug, reveal_at)
VALUES (:'event_name', :'event_slug', :'reveal_at'::timestamptz)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, reveal_at = EXCLUDED.reveal_at;

-- Una mesa/familia por número: token corto de 12 chars (prolijo en WhatsApp).
-- El MISMO token se usa como token de invitación (token_invitacion = token_qr).
INSERT INTO table_qrs (event_id, table_number, qr_token)
SELECT e.id,
       g,
       encode(gen_random_bytes(6), 'hex')
FROM events e,
     generate_series(1, :num_tables) AS g
WHERE e.slug = :'event_slug'
ON CONFLICT (qr_token) DO NOTHING;

-- Un invitado (familia) por mesa, con el mismo token del QR.
INSERT INTO guests (event_id, table_qr_id, token, name)
SELECT t.event_id, t.id, t.qr_token, 'Mesa ' || t.table_number
FROM table_qrs t
JOIN events e ON e.id = t.event_id
WHERE e.slug = :'event_slug'
ON CONFLICT (token) DO NOTHING;

-- Reporte de tokens para imprimir QRs y enviar invitaciones
SELECT t.table_number, t.qr_token
FROM table_qrs t
JOIN events e ON e.id = t.event_id
WHERE e.slug = :'event_slug'
ORDER BY t.table_number;
