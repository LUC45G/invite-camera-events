<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Agent skills

### Issue tracker

Tickets y specs locales en `.scratch/`. Antes de crear, consultar o actualizar
tickets, leer `docs/agents/issue-tracker.md`.

### Ticket commits

Implementar y verificar un ticket por vez. Crear al menos un commit por
ticket, identificado por su número. Se permiten varios commits para separar
dependencias dentro del mismo ticket; nunca incluir dos tickets en un commit.
Actualizar el registro local del ticket con resultados y pendientes antes
de cerrarlo. Preparar solo los archivos del ticket, conservando cambios
ajenos y documentos locales fuera del commit. Hacer push solo cuando el
usuario lo solicite.

### Triage labels

Antes de clasificar tickets, leer `docs/agents/triage-labels.md`.

Al inicio de cada turno, revisar los tickets de `.scratch/`. Si existen tickets
con `needs-triage`, `needs-info` o `ready-for-human`, recordarlos al usuario en
la respuesta, indicando su título, ruta y estado. Si el directorio todavía no
existe, continuar; no hay tickets que recordar.

### Domain docs

Un solo contexto: `GLOSSARY.md` y `docs/adr/`. Antes de explorar el dominio,
leer `docs/agents/domain.md`.

### Progress and learning

Durante cada trabajo, informar el progreso con actualizaciones breves: qué se
está haciendo, por qué, qué se descubrió y cómo se verificará el resultado.
Explicar las decisiones técnicas relevantes en lenguaje claro para que el
usuario aprenda del proceso. Al terminar, indicar resultado, verificaciones
y problemas pendientes. Basar el progreso en hitos reales.
