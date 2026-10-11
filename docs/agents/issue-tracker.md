# Issue tracker: Local Markdown

Issues y specs de este repo viven en `.scratch/`.

## Convenciones

- Una feature por directorio: `.scratch/<feature-slug>/`.
- Spec: `.scratch/<feature-slug>/spec.md`.
- Tickets: `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numerados desde
  `01`, con un archivo por ticket.
- Registrar el estado actual con `Status:` cerca del comienzo; consultar
  `triage-labels.md` para los roles de triage.
- Cuando una skill solicite publicar un ticket, crear su archivo local.
- Cuando solicite consultar uno, leer el archivo correspondiente a su ruta
  o número dentro de la feature.

## Estructura de cada ticket

```markdown
# Título del ticket
Status: needs-triage

## Estado inicial
Situación original, objetivo y criterios de aceptación.

---

## Trabajo realizado
Pendiente.

---

## Estado posterior
Pendiente.
```

Conservar el estado inicial durante el trabajo. En `Trabajo realizado`,
registrar cambios, decisiones y verificaciones con sus resultados. En
`Estado posterior`, registrar el resultado, los problemas encontrados y
sus soluciones, así como pendientes y siguiente paso. Si no hubo problemas,
indicarlo; si un problema sigue abierto, marcarlo como pendiente.

Las conversaciones adicionales se agregan al final bajo `## Comentarios`.
Actualizar las secciones y el estado a medida que avanza el trabajo; no
registrar resultados ni verificaciones que todavía no se realizaron.

## Wayfinding

- Mapa: `.scratch/<effort>/map.md`, con Notes / Decisions-so-far / Fog.
- Ticket hijo: `.scratch/<effort>/issues/<NN>-<slug>.md`.
- `Type:` registra `research`, `prototype`, `grilling` o `task`.
- `Blocked by: NN, NN` registra dependencias; el ticket queda desbloqueado
  cuando todas están `resolved`.
- Frontier: tickets abiertos, desbloqueados y sin reclamar, por número.
- Claim: guardar `Status: claimed` antes de trabajar.
- Resolve: registrar la respuesta bajo `### Answer` en `Estado posterior`,
  guardar `Status: resolved` y agregar un resumen con enlace al mapa.

`claimed` y `resolved` son estados del flujo de wayfinding; los labels de
triage se definen en `triage-labels.md`.
