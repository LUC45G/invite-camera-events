# Runbook - QR Wedding

## 1. Requisitos

Configurar en Vercel y en `.env.local`:

| Variable | Uso |
|---|---|
| `DATABASE_URL` | Connection string de Neon PostgreSQL |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Cloudinary desde el navegador |
| `CLOUDINARY_API_KEY` | Firmas de subida |
| `CLOUDINARY_API_SECRET` | Firmas y limpieza de recursos |
| `ADMIN_PASSWORD` | Acceso a `/admin` |
| `WEDDING_CONTACT_NAME` | Contacto mostrado por la app |
| `WEDDING_CONTACT_PHONE` | Contacto mostrado por la app |

El contenido de la invitacion y los nombres de las familias se editan desde el
admin o en codigo segun corresponda; no hay CMS.

## 2. Base de datos

Para una base nueva o existente, ejecutar:

```bash
npm install
npm run db:migrate
```

`db:migrate` es no destructivo: crea tablas, agrega columnas y aplica las
migraciones repetibles. No crea eventos, no hace seed, no regenera tokens y no
borra datos. Se puede ejecutar antes de cada deploy.

Luego abrir `/admin`. En una base vacia, el asistente crea el unico evento.
En una base existente, el admin muestra los datos detectados y permite elegir
si conservarlos o eliminarlos. El borrado exige escribir `BORRAR TODO` y
conserva referencias si Cloudinary falla para permitir reintentar.

### Reset de desarrollo

`db:reset` es destructivo y solo sirve para una base aislada de desarrollo.
Editar primero la configuracion al comienzo de
`scripts/reset-db.mts`, incluyendo:

- `ACCESS_MODE = "invitations"` o `"public_qr"`.
- `NUM_FAMILIES` y `MAX_PHOTOS` para invitaciones.
- Inicio, ventana de carga y reveal.

Probar el plan sin modificar la base:

```bash
npm run db:reset
```

Ejecutar el reset real solo sobre una base de desarrollo:

```bash
npm run db:reset -- --yes
```

El reset trunca datos, reaplica schema y migraciones, crea un evento listo para
usar y genera nuevos tokens. Los QRs anteriores quedan invalidos. En modo
`public_qr` crea un solo token; en modo `invitations` crea las familias,
invitaciones y cupos configurados.

## 3. Setup inicial desde admin

1. Ingresar a `/admin` con `ADMIN_PASSWORD`.
2. Completar nombre interno, fecha y hora de inicio, fecha y hora de reveal,
   cupo predeterminado y modalidad.
3. En `invitations`, indicar cuantas familias crear inicialmente y revisar la
   tabla de nombre y cupo de cada familia. Se pueden crear o eliminar después.
4. Configurar mensaje de invitacion con `{nombre}` y `{link}` y un contacto
   HTTPS o `mailto:` para cambios de contenido.
5. En `public_qr`, revisar el enlace y QR unico. No se crean familias, RSVP ni
   mesas.
6. Confirmar el setup. La modalidad queda bloqueada; la fecha de inicio y
   reveal se validan contra la ventana de carga.

La carga abre a las 12:00 del mediodia del dia del evento y cierra 24 horas
despues. Por ejemplo, evento el 5 de noviembre: cierre el 6 de noviembre a
las 12:00. Las cargas cuya marca de tiempo sea anterior al cierre se aceptan.

## 4. QR e invitaciones

En modo `invitations`, cada familia tiene un QR y un enlace de invitacion.
La familia debe aceptar el RSVP antes de vincular el dispositivo. Desde el
admin se pueden pausar o reactivar familias; una vez iniciado el evento no se
modifican sus nombres, cupos o QR.

En modo `public_qr`, el QR unico abre directamente la carga. Cada navegador
tiene una sesion y cupo independiente. La ruta principal del evento responde
404; las rutas `/upload`, `/galeria` y `/live` siguen disponibles.

## 5. Deploy y prueba previa

1. Configurar todas las variables en Vercel.
2. Desplegar la rama elegida.
3. Ejecutar `npm run db:migrate` contra Neon antes de usar el admin.
4. Abrir `/admin` desde la URL HTTPS de Vercel.
5. Usar `Mostrar QR de prueba`.
6. Escanear desde un celular, sacar una foto, confirmar y subirla.
7. Revisar la galeria de prueba y confirmar que la foto no aparece en `/live`,
   galeria publica ni exportacion.
8. Usar `Limpiar fotos de prueba`. Si Cloudinary falla, reintentar la limpieza
   desde el mismo panel.

La prueba temporal dura 30 minutos y permite una sola foto. Al completar o
cancelar, su QR queda invalido y hay que generar otro. Las fotos de prueba
quedan aisladas de las consultas reales.

## 6. Operacion durante el evento

1. Abrir `/<slug>/live` en la pantalla de proyeccion.
2. Abrir `/admin` en el dispositivo del organizador.
3. Compartir los QRs de familia o el QR unico segun la modalidad.
4. Controlar RSVP, familias pausadas, moderacion, reveal y proyeccion desde
   admin.
5. Confirmar que las fotos aprobadas aparezcan en la proyeccion y que las
   pendientes se indiquen en moderacion.
6. Descargar el ZIP de fotos aprobadas antes de borrar el evento.

La regla automatica de moderacion aprueba scores NSFW menores a `0.7`. Scores
de `0.7` o nulos quedan pendientes.

## 7. Contingencias

| Problema | Accion |
|---|---|
| Cloudinary no responde | Pausar cargas desde admin y reintentar cuando vuelva |
| Foto inapropiada | Moderar desde admin; el score NSFW solo prioriza revision |
| QR de prueba vencido o cancelado | Generar otro desde admin |
| Limpieza de prueba fallida | Usar `Limpiar fotos de prueba` nuevamente |
| Familia con problemas durante el evento | Pausarla; no borrar ni cambiar su identidad |
| QR perdido | Copiar o descargar el QR vigente desde admin |
| Datos de un evento | Exportar primero; `Borrar todo` requiere confirmacion exacta |

## 8. Verificaciones locales

```bash
npm test
npx tsc --noEmit
npm run db:reset
npm run load:test
```

Las pruebas usan base aislada y Cloudinary simulado cuando corresponde. No
ejecutar `db:reset -- --yes` sobre Neon de produccion.
