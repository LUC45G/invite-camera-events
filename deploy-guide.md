# Deploy de un evento por clon en un VPS

Este proyecto funciona como una instalación independiente por evento. Cada evento tiene su propio clon, proceso de Next.js, puerto, contraseña de admin y subdominio. Neon y Cloudinary pueden ser compartidos.

La base compartida es el registro de instalaciones: `EVENT_SLUG` identifica el evento, `DEPLOYMENT_ID` identifica el clon y `EVENT_HOSTNAME` identifica el subdominio. Neon impide duplicar esas identidades mediante índices únicos.

Este procedimiento todavía no se puede probar de punta a punta desde este entorno porque no es el VPS real. El proxy, HTTPS, DNS, systemd y la cámara deben verificarse en el primer despliegue real.

## Servicios compartidos

- Una base Neon compartida para todos los eventos.
- Una cuenta Cloudinary compartida.
- Un dominio base, por ejemplo `eventos.example.com`.

Usar Linux con systemd, Caddy y Node.js 22.18 o posterior (los scripts usan TypeScript nativo). Instalar Node de forma accesible para el usuario de servicio; comprobar `node --version` y `command -v npm`. El ejemplo asume npm en `/usr/bin/npm`; ajustar `ExecStart` si la ruta real difiere.

Cloudinary separa los archivos por evento:

```text
weddings/{slug}/table
weddings/{slug}/public
weddings/{slug}/test/{testRunId}
```

El VPS guarda código, builds y logs. Las fotos permanecen en Cloudinary.

## Crear una instalación nueva

Usar un directorio, usuario de servicio y puerto propios:

```bash
sudo mkdir -p /srv/qr-wedding
sudo useradd --system --user-group --no-create-home --home-dir /srv/qr-wedding/daniela-miguel --shell /usr/sbin/nologin qr-daniela-miguel
sudo install -d -o qr-daniela-miguel -g qr-daniela-miguel /srv/qr-wedding/daniela-miguel
sudo -u qr-daniela-miguel -H git clone <repo-url> /srv/qr-wedding/daniela-miguel
cd /srv/qr-wedding/daniela-miguel
sudo -u qr-daniela-miguel -H npm ci
```

Crear `.env.local`:

```env
DATABASE_URL="<neon-database-url-compartida>"
EVENT_SLUG="daniela-miguel"
DEPLOYMENT_ID="daniela-miguel-vps-01"
EVENT_HOSTNAME="daniela-miguel.eventos.example.com"
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="<cloud-name>"
CLOUDINARY_API_KEY="<api-key>"
CLOUDINARY_API_SECRET="<api-secret>"
ADMIN_PASSWORD="<contraseña-unica-del-evento>"
WEDDING_CONTACT_NAME=""
WEDDING_CONTACT_PHONE=""
```

`EVENT_SLUG` debe usar minúsculas, números y guiones. `DEPLOYMENT_ID` debe ser único por clon y conservarse al reiniciar. `EVENT_HOSTNAME` debe ser el subdominio exacto, sin protocolo ni puerto. No reutilizar estos valores ni la contraseña de otro evento.

Crear el archivo con `sudoedit /srv/qr-wedding/daniela-miguel/.env.local`. Luego asignar su propietario y permisos:

```bash
sudo chown qr-daniela-miguel:qr-daniela-miguel .env.local
sudo chmod 600 .env.local
```

En producción las tres variables de identidad son obligatorias, tanto al compilar como al iniciar. El host se normaliza a minúsculas y también se valida para las APIs. Los puertos de Next escuchan solo en `127.0.0.1`: el acceso externo pasa por Caddy.

## Migrar y registrar

```bash
sudo -u qr-daniela-miguel -H npm run db:migrate
sudo -u qr-daniela-miguel -H npm run build
```

La migración permite varios eventos en la misma base, elimina la antigua restricción de un solo evento y vincula un evento existente al clon cuando coincide el slug y todavía no tenía despliegue asignado.

Si otro evento ya usa el slug, el identificador de despliegue o el subdominio, la base rechaza la operación. No forzar el alta cambiando registros manualmente.

La migración no elimina registros duplicados para resolver conflictos. Si detecta números de familia o hosts duplicados en datos anteriores, se detiene para poder corregirlos sin borrar contenido. No ejecutar una versión antigua del runner contra la base compartida: todos los clones deben usar esta versión o una posterior.

## Primer ingreso al admin

Levantar el proceso en un puerto propio:

```bash
sudo -u qr-daniela-miguel -H npm run start -- --hostname 127.0.0.1 --port 3101
```

Abrir `https://daniela-miguel.eventos.example.com/admin`. En un clon nuevo aparece el setup inicial porque todavía no existe un evento registrado con esa combinación de slug, despliegue y host.

Esta ejecución manual sirve para comprobar el proceso. Detenerla con Ctrl+C antes de activar systemd, para dejar libre el puerto 3101.

Si se elige `public_qr` / single-event:

- no se crea invitación;
- la página principal responde 404;
- siguen disponibles carga, galería y `/live`;
- el QR público se crea desde el admin.

Si se elige `invitations`, la página principal muestra la invitación y el setup crea las familias/QR iniciales.

## Reverse proxy y HTTPS

Ejemplo de Caddy:

```caddyfile
daniela-miguel.eventos.example.com {
    reverse_proxy 127.0.0.1:3101
}
```

Cada subdominio debe aparecer una sola vez y apuntar al puerto de un solo clon. El DNS debe apuntar al VPS. HTTPS es obligatorio para la cámara.

`proxy.ts` valida el host configurado y permite estas rutas limpias:

```text
/       -> /{slug}
/upload -> /{slug}/upload
/live   -> /{slug}/live
/galeria -> /{slug}/galeria
```

Las URLs de QR que usan `/{slug}/...` continúan funcionando.

## Proceso aislado

Crear un servicio systemd por evento:

```ini
[Unit]
Description=QR Wedding Daniela Miguel
After=network.target

[Service]
Type=simple
User=qr-daniela-miguel
WorkingDirectory=/srv/qr-wedding/daniela-miguel
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm run start -- --hostname 127.0.0.1 --port 3101
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Guardar como `/etc/systemd/system/qr-wedding-daniela-miguel.service` y activar:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now qr-wedding-daniela-miguel
```

Reiniciar o reconstruir un evento solo debe usar su propio directorio, puerto y servicio. `npm run db:reset` está limitado al `EVENT_SLUG`, `DEPLOYMENT_ID` y `EVENT_HOSTNAME` configurados; no debe usarse `TRUNCATE` global.

Para actualizar un clon, detener solo su servicio, actualizar su repositorio, ejecutar `npm ci`, `npm run db:migrate` y `npm run build` como su usuario, y reiniciar solo ese servicio. No borrar su `.env.local`. Revisar `journalctl -u qr-wedding-daniela-miguel` si falla.

El reset es exclusivamente de desarrollo: elimina los recursos del evento en Cloudinary antes de borrar sus referencias y crea el evento de ejemplo del script. Si falla la limpieza, conserva los datos para reintentar. Para un evento real nuevo usar otro clon y el setup inicial; no usar reset para migrar producción.

## Moderación y archivos

Cada finalización verifica en Cloudinary que exista el recurso esperado. El servidor descarga una miniatura de ese recurso y ejecuta NSFWJS con el modelo MobileNetV2 incluido en el paquete. El score del navegador no determina la aprobación. Se aprueba automáticamente solo si el score de servidor es menor a `0.7`; si no, o si falla la clasificación, queda pendiente.

El modelo se carga una vez por proceso y la inferencia se procesa de una imagen por vez para limitar el consumo de CPU y memoria. No requiere configurar un servicio de clasificación pago. Medir tiempos y capacidad con el VPS real y comprobar los límites de la API de Cloudinary antes del evento.

Las fotos de prueba no entran en la galería ni en el feed real. La limpieza conserva referencias si Cloudinary no confirma todos los borrados. El ZIP devuelve error si no pudo descargar alguna foto, para evitar entregar una copia incompleta como exitosa.

## Agregar otro evento

Repetir el procedimiento con otro directorio, puerto, servicio, slug, host y contraseña. Se puede reutilizar `DATABASE_URL` y Cloudinary porque las relaciones y carpetas se separan por slug.

Antes de iniciar el segundo clon:

```bash
grep -E '^(EVENT_SLUG|DEPLOYMENT_ID|EVENT_HOSTNAME)=' /srv/qr-wedding/daniela-miguel/.env.local
grep -E '^(EVENT_SLUG|DEPLOYMENT_ID|EVENT_HOSTNAME)=' /srv/qr-wedding/otro-evento/.env.local
```

Un reset, borrado o reinicio del primer clon no debe ejecutar comandos sobre el directorio, servicio o evento del segundo.

## Verificación del primer deploy real

1. El subdominio nuevo abre `/admin` y muestra setup inicial.
2. `public_qr` hace que `/` responda 404.
3. `/upload`, `/live` y `/galeria` funcionan para ese slug.
4. El QR de prueba permite subir y limpiar una foto.
5. Un segundo clon no ve fotos, sesiones, RSVP, QR ni configuración del primero.
6. Reiniciar o resetear el primero conserva disponible el segundo.
7. Registrar un slug, despliegue o subdominio duplicado se rechaza.
8. La cámara funciona desde un celular con HTTPS real.

También verificar logs, certificados, backups de Neon y límites de Cloudinary. Este entorno no puede validar proxy, DNS, systemd, HTTPS ni cámara real.
