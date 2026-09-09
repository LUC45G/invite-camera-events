# Plan: Sincronizar DESIGN.md con el runtime real

## Context
- **Commit:** (executor: run `git rev-parse --short HEAD` before starting)
- **Audited surface:** `/[slug]` invitation page, branch `option-2`
- **Root cause:** Several user-approved changes were applied to code without updating DESIGN.md, so the documented system and the shipped page diverge.

## Change
Update `DESIGN.md` (and only DESIGN.md — no product source changes) so every section reflects current runtime:

1. **Layout > Spatial Model** (line ~101): replace
   > `scroll-snap-type: y mandatory`
   with
   > `scroll-snap-type: y proximity` — fast swipes scroll freely; the browser only snaps when the finger stops near a snap point. Rationale: mandatory skipped sections on mobile momentum swipes.

2. **Do's and Don'ts > Don't** (line ~180): amend the last rule to:
   > "Don't animate with transforms beyond the established 8px translateY reveal pattern **and the documented FAQ accordion exception**."
   Then add under **Components** a new `### FAQ Accordion` section documenting:
   - Native `<details>/<summary>` with shared `name="faq"` (single-open accordion)
   - `+` icon rotates 45° to become `×` on open (`group-open:rotate-45`, 200ms)
   - Content expands via `grid-template-rows: 0fr → 1fr`, 300ms ease-out (`.faq-content` in `app/globals.css`)
   - Items fade in staggered (`animation-delay: index * 100ms`, 400ms, `.faq-item`)
   - Reduced motion: both animations disabled, content always visible

3. **Elevation & Depth / new "Browser Surfaces" note:** document the two additions in `app/globals.css`:
   - `::selection`: bronze background, ivory text
   - Custom scrollbar: 6px, bronze thumb, transparent track, on `.snap-container`

4. **Layout > Container:** replace "No max-width container" with:
   > Content blocks use fixed widths: FAQ and RSVP center a `w-[300px]` column on mobile, `w-[400px]` at `sm+` (`sm:w-[400px]`), inside full-viewport sections with `px-6` padding.

## Acceptance
- `grep -c "mandatory" DESIGN.md` returns 0
- DESIGN.md contains a "FAQ Accordion" component section
- DESIGN.md documents `::selection`, scrollbar, and the fixed-width container rule
- No other files modified

## Affected surfaces
- `DESIGN.md` only
