# Khaylub.com — Current State

> The authoritative description of what Khaylub.com **is today**. Where this and the
> older planning docs disagree, this document is correct about the present.
> Last verified against `website/` files on 2026-06-19.
>
> **Note:** this supersedes the previous version of this file, which described an
> earlier build (animated loader, campfire/compass scenes, "Summit Render / Trail
> Engine" cards). That build was replaced by the current rebuild below.

## What exists today

A complete, working **single-page static website** in `website/`, plain web tech:

| File | Role |
|------|------|
| `website/index.html` | Markup for the whole page |
| `website/styles.css` | All visuals, color progression, scroll-reveal, responsive + reduced-motion |
| `website/script.js` | Footer year + scroll-reveal (IntersectionObserver, staggered) |
| `website/favicon.svg` | Inline SVG summit favicon |

No build step, no framework, no dependencies. Open `index.html` and it runs.

### Theme & design language (as actually coded)

- **Theme:** "Toward the Summit" — a traveler ascending, told through scroll.
- **Color progression:** Dawn → Alpine → Summit, blended per section via `data-palette`
  (warm cream/tan → cool alpine blue-grey → clean summit light).
- **Type:** display = Georgia serif; body = system-ui sans.
- **Motion:** scroll-reveal (fade + rise with gentle stagger); a floating "scroll" hint.
  All motion disabled under `prefers-reduced-motion`.
- **Inspiration:** Noomo storytelling (scroll-driven narrative), noted in the CSS header.
- **Phase 3 hook:** a `#canvas-root` div is present, fixed, inert — reserved for a future
  Three.js scene. Empty in Phase 1.

### Page structure

1. **Fixed nav** — blurred bar; brand + links to About, Journey, Projects, Contact.
2. **Hero** — "Toward the Summit," line "In ascending, we become," CTA "Follow the trail."
3. **About ("The Traveler")** — bio lines, roles (CIS Student · Web Developer · Blender
   Artist), and a "Currently climbing" list (web dev; 3D/Blender; cybersecurity via coursework).
4. **Journey ("The Ascent" / "Elevation gained")** — four waypoints: Math 65 Test-Out,
   Web Fundamentals, Blender Basics, CIS Coursework.
5. **Projects ("What I've Carried")** — four real cards with honest badges:
   Khaylub.com (In progress), EyesUnclouded.ai (Concept), Cloelia.ai (Concept),
   Manors.ai (Concept).
6. **Contact ("Reach Out")** — `mailto:hello@khaylub.com`.
7. **Footer** — auto year.

## What works

- Loads instantly; zero network/asset dependencies (pure HTML/CSS/JS).
- Responsive (collapses at 640px); semantic sections; `aria-hidden` on the inert canvas.
- `prefers-reduced-motion` fully handled; scroll-reveal degrades to visible.

## What this site is NOT (today)

No Next.js, React, React Three Fiber, Three.js, Tailwind, GLB, or Vercel config — and
no Blender asset wired in yet. Those belong to `FUTURE_VISION.md` / Phase 3. There is
also **no animated loader, no campfire/compass graphics, and no social links** in the
current markup (those were the earlier build).

## Honest gaps before launch

- Not deployed; domain `khaylub.com` and HTTPS not yet set up.
- Contact email `hello@khaylub.com` needs a real mailbox.
- Project cards are real, but three of four are concept-stage (correctly badged).
- Open Graph share image is a placeholder path (`assets/og-cover.jpg`).
- See `MVP_LAUNCH_ROADMAP.md` for the launch checklist.

## Pointers

- Launch path: `MVP_LAUNCH_ROADMAP.md`
- Store ownership (repo vs Obsidian vault): `SOURCE_OF_TRUTH.md`
- Narrative/design decisions are developed in the Obsidian vault `01 Projects/Khaylub.com/`.
