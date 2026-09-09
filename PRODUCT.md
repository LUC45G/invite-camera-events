# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Wedding organizer/couple (manages the event, moderates photos, controls the slideshow) and wedding guests (RSVP, upload photos via QR, view live projection). Both are primary audiences.

## Product Purpose

A single-use wedding companion: guests upload photos from their phones without downloading an app, photos project live at the venue, and a post-reveal gallery preserves the memories. Success means every guest can participate and the couple gets a curated collection of candid moments.

## Positioning

QR-based photo upload with no app required — guests scan a printed code at their table, snap, and upload. The live projection creates a shared experience during the event, and the reveal moment turns the gallery into a gift.

## Operating Context

- Event day: guests scan QR codes printed at each table, upload photos in real time, photos appear on venue screens
- Pre-event: organizer sends personalized links for RSVP confirmation
- Post-event: gallery goes public, organizer downloads a zip of approved photos
- Environment: wedding venue with Wi-Fi, mobile phones as primary devices, TV/projector for live slideshow

## Capabilities and Constraints

- RSVP with unique token links (per-guest personalized URLs)
- Guest camera upload (24 photos per table limit, rear camera only, no gallery upload)
- Photo normalization to 4:3 format for uniform projection
- Live slideshow on venue screens (auto-advance, configurable speed, pause/next/prev from admin)
- Admin panel: photo moderation (approve/reject, NSFW detection flagging), RSVP management, QR code generation, slideshow control, storage monitoring
- Post-reveal public gallery with individual photo download
- Bulk zip download for organizer
- No app download required — everything runs in mobile browser
- Cloudinary for image hosting and transformation
- Neon (serverless Postgres) for data persistence

## Brand Commitments

- Couple name: Sofía & Mateo
- Venue: Salón Jardín del Valle
- Date: Sábado 12 de septiembre de 2026
- Visual language: cream background, bronze/champagne accents, ink text, serif+sans font pairing, scroll-snap full-screen sections, reveal animations
- Spanish language throughout

## Evidence on Hand

- `presentacion.md`: full functional spec with flow, FAQ, and feature breakdown
- Working invitation page with RSVP, countdown, split sections, FAQ
- Incumbent visual system in `app/globals.css` and Tailwind theme tokens
- Cloudinary integration in `lib/cloudinary.ts`
- Database schema in `db/schema.sql`
- RSVP API route in `app/api/rsvp/`

## Product Principles

1. No app download — every interaction happens in the mobile browser
2. Simplicity over features — guests scan, snap, done
3. Shared experience — live projection makes individual photos a collective moment
4. Curated by default — moderation ensures quality, NSFW detection adds safety
5. Temporal ceremony — the reveal moment transforms private uploads into public celebration

## Accessibility & Inclusion

No product-specific requirements beyond standard web practices.
