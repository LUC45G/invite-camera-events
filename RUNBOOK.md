# Runbook — QR Wedding

## 1. Prerequisitos (lo que hay que aportar)

| Requisito | Dónde | Notas |
|---|---|---|
| `DATABASE_URL` | Neon → Project → Connection string | Postgres serverless |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Cloudinary Dashboard | Plan free alcanza para 1 evento |
| `ADMIN_PASSWORD` | Elegir una | Acceso al panel admin |
| Datos del evento | Nombre, slug, fecha reveal, contacto | Para seed y página |
| Cantidad de mesas/familias | Número | Una invitación por mesa |

## 2. Setup de base de datos

1. Abrir Neon → SQL Editor.
2. Pegar y ejecutar `db/schema.sql` (idempotente).
3. Editar las variables al inicio de `db/seed.sql` y ejecutarlo.
4. El SELECT final imprime `table_number` + `qr_token` → guardar esa salida.

### 2b. Reset (borrar todo y re-seed)

Editar la sección `CONFIGURACIÓN` de `scripts/reset-db.mts` (evento, mesas, reveal) y:

```bash
npm run db:reset        # muestra el plan, NO ejecuta nada
npm run db:reset -- --yes  # ejecuta el reset real
```

- Trunca todas las tablas, re-aplica schema y re-seed.
- **Regenera todos los tokens** → los QRs impresos anteriores quedan inválidos. Re-imprimir después.

## 3. QRs e invitaciones

- **QR por mesa**: URL `https://<dominio>/<slug>/upload?qr=<qr_token>` → generador (qrencode o web) → imprimir, uno por mesa.
- **Invitación**: URL `https://<dominio>/<slug>?token=<qr_token>` → enviar por WhatsApp/mail a cada familia.
- Un mismo token sirve para ambas cosas (invitación = mesa).

## 4. Deploy

1. Configurar env vars en Vercel (las 5 de la tabla de prerequisitos).
2. Deploy del repo.
3. Verificar HTTPS (la cámara no funciona sin SSL).
4. Probar en un celular real: invitación → RSVP; QR → cámara.

## 5. Día del evento

1. Laptop/TV en `<dominio>/<slug>/live`, fullscreen.
2. Admin abierto en el celular del organizador para moderar.
3. QRs en las mesas.

## 6. Contingencias

| Problema | Acción |
|---|---|
| Cloudinary caído | Pausar subida: `UPDATE events SET upload_open = false;` y avisar por las pantallas |
| Spam / foto inapropiada | Rechazar desde admin; NSFW flag prioriza revisión |
| Red del salón caída | La proyección muestra la última foto conocida (fallback) |
| QR perdido | Regenerar token de esa mesa y reimprimir |
| Borrar todo al final | Admin → opción "borrar todo" (borra DB + Cloudinary) |

## 7. Post-evento

1. Descargar ZIP de fotos aprobadas desde admin.
2. Revelar galería (auto por `reveal_at` o manual).
3. Las fotos viven hasta que Cloudinary las purge o admin borre todo.
