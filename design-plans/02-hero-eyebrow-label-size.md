# Plan: Hero eyebrow — remove sm:text-base

## Context
- **Commit:** (executor: run `git rev-parse --short HEAD` before starting)
- **Audited surface:** `/[slug]` hero section, branch `option-2`
- **Root cause:** The Label spec (DESIGN.md line 92) fixes label size at 0.875rem; the only documented exception is letter-spacing (0.3em), not size. At `sm+` the eyebrow renders 1rem, competing with body text and breaking the documented hierarchy.

## Change
In `app/[slug]/page.tsx`, hero section (line ~27), change:

```tsx
<p className="font-sans text-sm tracking-[0.3em] text-bronze uppercase sm:text-base">
```

to:

```tsx
<p className="font-sans text-sm tracking-[0.3em] text-bronze uppercase">
```

No other breakpoints or properties change. The 0.3em tracking exception stays as documented.

## Acceptance
- Hero eyebrow is 0.875rem at all viewport widths
- `grep -c "sm:text-base" app/[slug]/page.tsx` returns 0
- Visual check: eyebrow reads clearly subordinate to the date line below it at sm+ widths

## Affected surfaces
- `app/[slug]/page.tsx` (hero eyebrow only)
