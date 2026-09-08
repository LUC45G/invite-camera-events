# QR Wedding — Resumen Funcional

## ¿Qué es?

Una página web que permite a los invitados de una boda subir fotos desde sus celulares, sin necesidad de descargar ninguna aplicación. Las fotos se proyectan en vivo en las pantallas del evento y, al finalizar la boda, se revelan todas juntas.

---

## Partes de la app

### 1. Invitación web

Es el primer punto de contacto. Cada invitado recibe un **link personalizado** por WhatsApp, mail o como se quiera compartir. Al abrirlo ven:

- Foto de portada, nombre de los novios, fecha, hora y lugar
- Cómo llegar (mapa)
- Código de vestimenta
- Una explicación breve de cómo funciona la app

El link tiene un **código único** que identifica a cada invitado. Según lo que hayan hecho:

- **Si todavía no confirmaron asistencia**: les aparece un botón "Confirmar asistencia" con un formulario
- **Si ya confirmaron**: ven el resumen de su respuesta (cuántas personas, restricciones alimentarias) y un teléfono de contacto para cualquier cambio
- **Si entran sin código** (link genérico sin token): ven toda la info de la boda pero no pueden confirmar asistencia

### 2. Cámara del invitado

Durante la boda, en cada mesa hay un **código QR impreso**. Al escanearlo con el celular, se abre la cámara. Desde ahí el invitado puede:

- **Sacar fotos** directamente desde la cámara trasera
- **Subirlas** con un toque
- Ver cuántas fotos lleva subidas (el límite es de 24 por mesa)
- Ver una **preview** antes de subir, para confirmar que le gusta la foto

Las fotos se normalizan automáticamente: todas quedan en el mismo formato (4:3) para que la proyección se vea uniforme, sin importar qué celular use cada persona.

**No hay galería visible para el invitado mientras sube fotos.** Las fotos subidas no se ven en el celular de quien las sacó. La gracia es que nadie ve las fotos hasta que se proyectan o hasta que termina la boda.

**Un QR por mesa**: todos los invitados de la misma mesa usan el mismo código para subir fotos.

### 3. Pantalla de proyección (en vivo)

Es la pantalla que se conecta a un televisor o proyector en el salón. Muestra un **slideshow automático** con las fotos que los invitados van subiendo en tiempo real.

Características:

- Las fotos aparecen a medida que se suben, sin recargar la pantalla
- Avanza sola cada unos segundos (configurable desde el panel de control)
- Se puede pausar, avanzar o retroceder manualmente desde el panel de control
- Ocupa toda la pantalla (modo presentación)
- Si se corta la conexión a internet, vuelve a mostrar la última foto conocida hasta recuperarse

### 4. Panel de administración

Es donde el organizador de la boda controla todo. Se accede desde cualquier navegador con contraseña.

#### Control general

- Alertas de fotos pendientes de revisión
- Generar y descargar los **códigos QR** para imprimir (uno por mesa)
- Configurar la fecha y hora en que se revelan las fotos
- Ajustar la velocidad del slideshow de proyección
- Monitorear el espacio utilizado en la nube

#### Moderación de fotos

- Ver todas las fotos subidas en una grilla
- **Aprobar** o **rechazar** cada foto individualmente
- Aprobar o rechazar todas las fotos pendientes de una vez
- Las fotos que el sistema detecta como potencialmente inapropiadas aparecen marcadas para revisión prioritaria
- **Descarga masiva**: botón para descargar todas las fotos aprobadas juntas en un archivo `.zip`

#### Control de la proyección

- Pausar o reanudar el slideshow desde el celular
- Avanzar o retroceder manualmente entre fotos
- Ajustar la velocidad del slideshow en tiempo real

#### Lista de invitados (RSVP)

- Ver quiénes confirmaron asistencia, quiénes rechazaron y quiénes aún no respondieron
- Cantidad total de personas confirmadas
- Restricciones alimentarias reportadas

### 5. Galería post-reveal

Después de la boda, cuando el organizador aprueba todas las fotos **y** pasó la fecha/hora del revelado, la galería se hace pública automáticamente. Cualquier persona con el link puede:

- Ver todas las fotos aprobadas en una grilla
- Hacer clic en cualquier foto para verla en grande
- **Descargar fotos individuales**

El organizador, además, puede descargar **todas las fotos juntas en un archivo `.zip`** desde su panel de administración.

---

## Flujo resumido

```
1. El organizador crea el evento y genera los QR (uno por mesa)
2. Imprime los QR y los coloca en cada mesa
3. Envía los links personalizados a cada invitado (WhatsApp, mail, etc.)
4. Los invitados abren el link, ven la invitación y confirman asistencia
5. Durante la boda, escanean el QR de su mesa, sacan fotos y las suben
6. Las fotos aparecen en la pantalla del salón en vivo
7. El organizador revisa y aprueba las fotos desde su celular
8. Cuando todas las fotos están aprobadas y pasa la hora del revelado,
   la galería se abre para todos
9. El organizador descarga el archivo .zip con todas las fotos
```

---

## Preguntas frecuentes (para los usuarios)

**¿Necesito descargar una app?**
No. Todo funciona desde el navegador del celular. Solo hay que escanear el QR.

**¿Puedo sacar fotos desde mi galería?**
No, solo desde la cámara en vivo. Así todas las fotos son del momento.

**¿Cuántas fotos puedo subir?**
Hasta 24 por mesa. Si una mesa necesita más, se puede ajustar desde el panel de administración.

**¿Se ven mis fotos en mi celular?**
No. Las fotos se suben a la nube y aparecen en la pantalla del salón. En tu celular no se ve nada.

**¿Qué pasa si me equivoco y subo una foto que no quiero?**
El organizador puede eliminar fotos desde su panel de control.

**¿Puedo subir fotos después de la boda?**
Depende de la configuración del organizador. Generalmente la carga se cierra al finalizar el evento.

**¿Las fotos quedan guardadas para siempre?**
Las fotos se almacenan durante un tiempo. El organizador puede descargarlas todas al finalizar.

**¿Quién puede ver las fotos después de la boda?**
Cualquiera que tenga el link. La galería es pública una vez que se revelan. Las fotos individuales se pueden descargar libremente. El archivo `.zip` con todas las fotos es solo para el organizador.
