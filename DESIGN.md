---
name: QR Wedding
description: Elegant wedding invitation and photo-sharing companion with cream, bronze, and ink palette
colors:
  cream: "#DFD1CC"
  bronze: "#B57E7F"
  ink: "#131313"
  ivory: "#FFFFFF"
  navy: "#000040"
typography:
  display:
    fontFamily: "Cormorant Garamond, Georgia, serif"
    fontSize: "clamp(3rem, 8vw, 4.5rem)"
    fontWeight: 400
    lineHeight: 1.1
  body:
    fontFamily: "Jost, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Jost, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "0.2em"
rounded:
  sm: "4px"
spacing:
  section-px: "24px"
  section-px-sm: "16px"
components:
  button-primary:
    backgroundColor: "{colors.bronze}"
    textColor: "{colors.ivory}"
    rounded: "{rounded.sm}"
    padding: "12px 32px"
  button-primary-hover:
    backgroundColor: "{colors.bronze}ee"
    textColor: "{colors.ivory}"
  input:
    backgroundColor: "{colors.ivory}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "10px 12px"
---

# Design System: QR Wedding

## Overview

**Creative North Star: "The Quiet Elegance"**

A restrained, warm visual world built on cream and bronze. The system prioritizes clarity and ceremony over decoration: full-viewport scroll-snap sections create a page-by-page reading rhythm, serif headings carry emotional weight while sans-serif body text stays effortlessly legible. Every element earns its place — no ornamental borders beyond the documented section decorations, no gradient washes, no hover theatrics beyond a subtle opacity shift. The palette is warm but not precious; the typography is classic but not stuffy.

**Key Characteristics:**
- Cream background with bronze accent on a strict two-color-plus-neutrals palette
- Full-viewport scroll-snap sections as the primary spatial model
- Serif/sans pairing (Cormorant Garamond + Jost) for display/body hierarchy
- Scroll-reveal animations with `prefers-reduced-motion` respect
- Minimal elevation — flat surfaces, no shadows, depth through image cropping, split layouts, and the documented section decorations

## Colors

A warm, muted palette anchored by cream and bronze. The accent is singular and deliberate.

### Primary
- **Warm Bronze** (#B57E7F): The sole accent. Used for CTAs, toggle states, link underlines, FAQ labels, and form focus borders. Appears sparingly — its rarity is the point.

### Neutral
- **Soft Cream** (#DFD1CC): Page background. Warm without being yellow; sets the inviting, paper-like tone.
- **Deep Ink** (#131313): Primary text color. Near-black with warmth; avoids the harshness of pure #000.
- **Clean Ivory** (#FFFFFF): Button text on bronze fills, input backgrounds, and the form field surface.
- **Classic Navy** (#000040): Focus-visible outline color only. Never used as a surface or text color.

### Named Rules
**The Single Accent Rule.** Bronze is the only chromatic accent on any screen. It is used on CTAs, active states, and a handful of label treatments — never more than ~15% of visible area. Cream and ink carry everything else.

**The Navy-is-for-Focus Rule.** Navy appears only as a `:focus-visible` outline. It is not a text color, background, or decorative element.

## Typography

**Display Font:** Cormorant Garamond (with Georgia, serif fallback)
**Body Font:** Jost (with system-ui, sans-serif fallback)

**Character:** The pairing is classical ceremony meets modern clarity. Cormorant Garamond's high-contrast serifs carry emotional gravity for names and headings; Jost's geometric sans-serif keeps body text neutral and easy to scan on mobile.

### Hierarchy
- **Display** (400, `clamp(3rem, 8vw, 4.5rem)`, line-height 1.1): Couple names on the hero. The largest text on the page.
- **Headline** (400, 2.25rem/3rem — `text-4xl sm:text-5xl` — line-height 1.1): Section headings ("Nuestra historia", "Preguntas", "Confirmá tu asistencia").
- **Body** (400, 1rem, line-height 1.6): Paragraphs, descriptions, RSVP form text. Max comfortable reading width.
- **Label** (400, 0.875rem, letter-spacing 0.2em, uppercase): Category labels, countdown units, FAQ question headers. Always bronze-colored. Hero eyebrow uses 0.3em for extra ceremony.

### Named Rules
**The Uppercase-Letter-Spacing Rule.** Labels and category headers use uppercase with `tracking-[0.2em]` or `tracking-[0.3em]`. This creates visual distinction from body text without adding a third font.

**The Text-Balance Rule.** Headings use `style={{ textWrap: "balance" }}` to prevent orphaned words on narrow screens.

## Layout

**Spatial Model:** Desktop uses full-viewport scroll-snap sections with `scroll-snap-type: y mandatory`. On mobile, the invitation uses natural document scrolling without snap-lock for Android/browser-chrome stability.

**Split Sections:** Two-column layouts at 65/35 or 35/65 ratio. On mobile, they stack vertically with image on top (50dvh) and text below (50dvh). The `reverse` prop swaps column order.

**Container:** Content blocks use fixed widths: FAQ and RSVP center a `w-[300px]` column on mobile, `w-[400px]` at `sm+`, inside full-viewport sections with `px-6` horizontal padding.

**Responsive:** Mobile-first. Split grids activate at `md` (768px). Typography scales with `sm:` variants. Full-viewport sections remain consistent across breakpoints.

**Density:** Generous whitespace. Form fields use `gap-5` (20px) between items. Sections center content vertically with `items-center justify-center`.

## Section Decorations

Floral PNGs anchor to section corners as a decorative frame. Configured in `lib/event-data.ts` under `decor`, rendered by `SectionDecor`.

- **Assets:** `public/decor/` — `rose-bottom-right.png`, `rose-top-left.png` (1:1, abrazan la esquina en L), `cherry-top-right.png`, `cherry-bottom-left.png` (16:9, rama pegada a un costado)
- **Placement:** one `{ src, corner, width, height, fit }` per decoration; corners are `top-left`, `top-right`, `bottom-left`, `bottom-right`
- **Fit modes:** `corner` (default) sizes by width so the art hugs the corner in L; `side` uses full height and hugs the horizontal edge, letting the transparent canvas overflow and get clipped
- **Anchoring:** mobile anchors to the full section; on split sections desktop anchors to the text column only, so the photo stays clean
- **Sizing:** corner squares `w-[75%] max-w-[560px] sm:w-[52%]`; corner wide assets (aspect > 1.6) `w-[95%] max-w-[680px] sm:w-[68%]`; side assets `h-full w-auto max-w-none`
- **Behavior:** `pointer-events-none`, `select-none`, `aria-hidden`, `alt=""` — never blocks interaction
- **Depth:** decoration `z-0` → photo `z-10` → text `z-20`. Decorations always sit **below** photos; text always sits above
- **Clipping:** decorated sections use `overflow-hidden` to crop any bleed

## Elevation & Depth

**Flat by design.** No box-shadows, no backdrop-blurs, no layered surfaces. Depth is conveyed through:
- Image fill within split sections (full-bleed photos create visual weight)
- Scroll-snap transitions that feel like turning pages
- Opacity shifts on secondary text (`text-ink/70`, `text-ink/55`)

## Shapes

**Corner Language:** `rounded-sm` (4px) on buttons and inputs — barely perceptible, just enough to avoid harsh rectangles. No pill shapes, no large radius, no decorative clipping.

**Borders:** Hairline borders on inputs (`border-ink/20`) and toggle buttons. Link underlines use `border-b` with subtle opacity. Structural hairlines are allowed for wayfinding (FAQ separators, timeline spine, scroll-dot track) and the documented section decorations are allowed as ornament; beyond those, no decorative borders.

## Components

### Primary Button
- **Shape:** `rounded-sm` (4px radius)
- **Default:** Bronze background (#B57E7F), ivory text, `px-8 py-3` (32px 12px), `text-base sm:text-lg`
- **Hover:** Background fades to 90% opacity (`hover:bg-bronze/90`). No transform, no shadow.
- **Disabled:** 60% opacity (`disabled:opacity-60`)
- **Transition:** `transition-colors` only — no transform, no shadow

### Toggle Button Group
- **Shape:** `rounded-sm` (4px radius), side-by-side with `gap-3`
- **Selected (accepted):** Bronze fill, ivory text, bronze border
- **Selected (declined):** Ink/5 background, ink/40 border, ink text
- **Unselected:** Ivory background, ink/20 border, ink text
- **Behavior:** `aria-pressed` for accessibility, `transition-colors`

### Text Input
- **Shape:** `rounded-sm` (4px radius), `border border-ink/20`
- **Background:** Ivory (#FFFFFF)
- **Text:** Ink, `text-lg`
- **Focus:** Border color shifts to bronze (`focus:border-bronze`)
- **Labels:** Sans-serif, `text-base tracking-wide text-ink/70`
- **Optional indicator:** `text-ink/45` in parentheses

### SplitSection
- **Desktop:** CSS Grid with 65/35 or 35/65 column split
- **Mobile:** Stacked, image top (50dvh), text bottom (50dvh)
- **Image:** Next.js `Image` with `fill` + `object-cover`, edge-to-edge
- **Text container:** Centered vertically and horizontally, `px-8 py-12`

### Countdown
- **Numbers:** Cormorant Garamond serif, `text-4xl sm:text-5xl`, `tabular-nums`
- **Labels:** Jost sans, `text-sm uppercase tracking-[0.2em] text-ink/55`
- **Layout:** Horizontal row with `gap-4 sm:gap-6`, centered

### Reveal (Scroll Animation)
- **Trigger:** IntersectionObserver at 20% threshold
- **Animation:** Fade-in + 8px upward translate over 1s ease-out
- **Reduced motion:** `prefers-reduced-motion: reduce` skips animation entirely, shows content immediately
- **Behavior:** One-shot — once visible, never re-hides

### FAQ Accordion
- **Mechanism:** `FaqItem` client component with `useState`; opening one dispatches a `faq:close-others` CustomEvent so only one stays open
- **Icon:** `+` rotates 45° to read as `×` when open (conditional `rotate-45`, 200ms)
- **Content:** Expands via `grid-template-rows: 0fr → 1fr` transition, 300ms ease-out (`.faq-content`)
- **Entrance:** Items fade in via `Stagger` (1000ms opacity ease-out, `150 + index * 150`ms delay)
- **Reduced motion:** `Stagger` and `.reveal` show immediately and `.faq-content` stays fully expanded; the icon rotation remains, as the documented transform exception

### Browser Surfaces
- **Selection:** Bronze background, ivory text (`::selection`)
- **Scrollbar:** 6px wide, bronze thumb, transparent track, on `.snap-container`. The thumb uses the `rounded.sm` token; on a 6px-wide thumb the browser clamps it to a 3px round silhouette.

## Do's and Don'ts

### Do:
- **Do** use bronze sparingly — it is the only accent, and its scarcity gives it weight.
- **Do** use `textWrap: "balance"` on all headings to prevent orphaned words.
- **Do** respect `prefers-reduced-motion` — the Reveal component and `.reveal` CSS class both handle this.
- **Do** use `tabular-nums` on any numeric display (countdown, counters) for stable digit widths.
- **Do** keep split sections at 65/35 — this ratio creates asymmetric visual interest without feeling unbalanced.

### Don't:
- **Don't** add box-shadows. The system is flat; depth comes from images and typography weight.
- **Don't** use navy for anything other than focus-visible outlines.
- **Don't** use more than one accent color on a screen. Bronze is it.
- **Don't** add decorative borders, dividers, or ornamental elements beyond the documented section decorations and the structural wayfinding hairlines. Let whitespace do the work.
- **Don't** use `rounded-lg` or larger radius — the system's corner language is subtle (4px).
- **Don't** animate with transforms beyond the established 8px translateY reveal pattern and the documented FAQ accordion exception.
