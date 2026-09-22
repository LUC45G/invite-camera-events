# Plan: Sincronizar DESIGN.md con el runtime real

**Status: ejecutado y reconciliado.** Este documento se conserva como registro. Su contenido original quedó desactualizado respecto del runtime; abajo está el estado final real.

## Context
- **Audited surface:** `/[slug]` invitation page, branch `option-2`
- **Root cause:** user-approved changes were applied to code without updating DESIGN.md, so the documented system and the shipped page diverge.

## Resultado final (estado real del runtime)

1. **Layout > Spatial Model** — el paso original pedía cambiar a `scroll-snap-type: y proximity`. **Eso se revirtió**: el runtime (y DESIGN.md) usa `y mandatory` en desktop y scroll natural sin snap en mobile.

2. **FAQ Accordion** — el paso original describía `<details>/<summary>` con `name="faq"`, `group-open:rotate-45` y `animation-delay` sobre `.faq-item`. **Esa implementación ya no existe.** El runtime es:
   - `FaqItem` client component con `useState`; abrir uno dispara un CustomEvent `faq:close-others` (single-open)
   - Ícono `+` con `rotate-45` condicional, 200ms
   - Contenido expandido vía `grid-template-rows: 0fr → 1fr`, 300ms ease-out (`.faq-content`)
   - Entrada por `Stagger` (1000ms opacity, delay `150 + index * 150`)
   - `.faq-item` fue eliminado de `app/globals.css` por ser una regla muerta

3. **Browser Surfaces** — aplicado sin cambios: `::selection` bronze/ivory y scrollbar 6px sobre `.snap-container`.

4. **Layout > Container** — aplicado sin cambios: FAQ y RSVP centran `w-[300px]` en mobile y `w-[400px]` en `sm+`.

## Acceptance (verificado)
- DESIGN.md documenta `::selection`, scrollbar y la regla de anchos fijos ✅
- DESIGN.md describe el mecanismo real del FAQ ✅
- No quedan referencias a `<details>`, `group-open` ni `.faq-item` en DESIGN.md ni en `app/globals.css` ✅
