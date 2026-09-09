# Plan: Headline spec — document 2.25rem mobile size

## Context
- **Commit:** (executor: run `git rev-parse --short HEAD` before starting)
- **Audited surface:** all section headings on `/[slug]`, branch `option-2`
- **Root cause:** DESIGN.md line 90 defines Headline as 2.5rem/3rem, but every section heading uses `text-4xl sm:text-5xl` = 2.25rem/3rem. Five headings share the same owner pattern; changing all headings to `text-[2.5rem]` is a visual regression risk on narrow phones (long headings like "Confirmá tu asistencia" wrap) for zero user benefit. The cheaper, safer correction is updating the spec to match the proven runtime.

## Change
In `DESIGN.md`, Hierarchy section (line ~90), change:

> - **Headline** (400, 2.5rem/3rem, line-height 1.1): ...

to:

> - **Headline** (400, 2.25rem/3rem — `text-4xl sm:text-5xl` — line-height 1.1): ...

No product source changes.

## Acceptance
- `grep -n "2.5rem" DESIGN.md` no longer claims Headline is 2.5rem on mobile
- Headline spec exactly matches the `text-4xl sm:text-5xl` pattern used by all section h2s
- No other files modified

## Affected surfaces
- `DESIGN.md` only
