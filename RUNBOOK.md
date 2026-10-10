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

### Migración para el asistente de configuración

Con `DATABASE_URL` configurada, ejecutar `npm run db:migrate`. Este comando
crea las tablas y aplica migraciones aditivas en transacciones; no ejecuta
seed, no borra datos y no regenera tokens. Repetirlo es seguro.

Después entrar a `/admin`. Si hay un evento existente pendiente de configurar,
elegir conservarlo y confirmar inicio/reveal, o eliminarlo explícitamente.
Mientras falte esa confirmación, se bloquean nuevas cargas. El borrado requiere
escribir `BORRAR TODO`, elimina recursos del evento en Cloudinary e invalida
sus QR; si falla, conservar las referencias y reintentar desde el admin.

Para comprobar migraciones y borrado sin servicios externos, usar `npm test`.
Las pruebas usan PostgreSQL aislado en memoria y Cloudinary simulado.

El seed/reset de las secciones siguientes corresponde al flujo manual anterior
y al desarrollo; no usar reset para migrar un evento que se quiera conservar.

### Instalación vacía desde el admin

Después de `npm run db:migrate`, entrar a `/admin` y autenticarse. El asistente
pide nombre del evento (visible solo en admin), inicio y reveal en horario de
Argentina, cupo predeterminado y familias iniciales. Revisar sus nombres y
cupos en la tabla, confirmar el resumen y crear. Los enlaces y QR quedan en
el panel. Redeploy no vuelve a crear el evento ni modifica sus tokens.

En esta entrega está habilitada la modalidad de invitaciones por familia.
El modo QR único y los controles automáticos de ventana se incorporan en los
tickets siguientes. La configuración guarda la ventana, pero la carga todavía
se controla con el interruptor manual hasta implementar el ticket de horarios.

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
4. Desde `/admin`, controlá RSVP, fecha de reveal, subida, proyección, almacenamiento y QR.
5. Descargá el ZIP antes de usar “Borrar todo”; esa acción pide confirmación exacta.

## 6. Contingencias

| Problema | Acción |
|---|---|
| Cloudinary caído | Pausar subida: `UPDATE events SET upload_open = false;` y avisar por las pantallas |
| Spam / foto inapropiada | Rechazar desde admin; NSFW flag prioriza revisión |
| Red del salón caída | La proyección muestra la última foto conocida (fallback) |
| QR perdido | Regenerar token de esa mesa y reimprimir |
| Borrar todo al final | Admin → opción "borrar todo" (borra DB + Cloudinary) |

### 6b. Prueba de carga (dry-run, sin fotos reales)

```bash
npm run load:test                                    # 50 sesiones + 20 streams en localhost
npm run load:test -- --host https://<preview>.vercel.app --n 100 --m 50
```

Mide que el endpoint de sesión responda (403 esperado = QR ficticio pero endpoint sano)
y que los streams SSE reciban heartbeat.

## 7. Post-evento

1. Descargar ZIP de fotos aprobadas desde admin.
2. Revelar galería (auto por `reveal_at` o manual).
3. Las fotos viven hasta que Cloudinary las purge o admin borre todo.
