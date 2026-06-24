# Khaylub.com — Current State

> The authoritative description of what Khaylub.com **is today**. Where this and the older
> planning docs disagree, this document is correct about the present.
> Last verified against the live site + `src/` on 2026-06-24.
>
> **Note:** a previous version of this file described the `website/` static page as the live
> site. That is no longer accurate — the live site is the **React + React Three Fiber app**
> at the repo root. `website/` is retained only as the no-WebGL fallback (see below).

## What exists today

**Launched and live at https://khaylub.com** (custom domain, HTTPS). The site auto-deploys from
`main` (host dashboard-managed; there is no deploy config committed to the repo). The live build is
the **React + Vite + React Three Fiber "Wanderer" experience** at the repo root (`index.html` +
`src/`) — `npm run dev` / `build` target this app.

A second, frozen codebase lives in `website/`: a standalone plain-HTML/CSS/JS page, retained as the
**no-WebGL fallback**. It is not the live site. (`_archive/` holds dead experiments.)

### The live experience (as actually built)

One continuous, scroll-driven timeline. A rigged GLB traveler ("the Wanderer") walks in place at
the world origin while the camera moves around him; a single normalized `scrollProgress` (0→1) is
the master clock every system reads.

- **Spine:** Lenis smooth scroll → `store/useExperience.js` (Zustand) holds `scrollProgress` +
  derived `stageId`; `three/CameraRig.jsx` and `three/Wanderer.jsx` read it each frame via
  `getState()` (never a per-frame React re-render). Choreography lives in `data/`
  (`stages.js`, `camera.js`, `copy.js`, `projects.js`, `palette.js`, `phoenix.js`).
- **Six phases** (`data/stages.js`, total scroll ≈ 856vh): Arrival → Philosophy → Areas of Focus →
  Project Discovery → Project Exploration → Contact, weighted unequally with a held "sky tail".
- **Atmosphere:** scroll-driven video plates over the 3D (`ui/VideoAtmosphere.jsx`) — a
  bottom-anchored ground-fog plate, dawn-grass, screen-blended embers, and scrubbed summit clouds.
  Tonal sky/ground colour ramps dawn→summit (`Atmosphere.jsx` + `data/palette.js`).
- **Phoenix finale:** a faint ember wakes at the midpoint, arcs behind the Wanderer, and resolves
  into fire at the summit; the camera tracks the rising firebird then sprints to a head-on hold.
- **Work section — concept "worlds":** five projects, each a short concept-visualization **film**
  on a card that **pulls out** into an accessible case-study panel (`ui/ProjectCards.jsx` +
  `ui/ProjectDetail.jsx`). Honest status: **Khaylub.com is Live** and links out; EyesUnclouded,
  Cloelia, FutureGenius, and Manors are **Concept** and show an "in design" note (no fake demo, no
  dead `#`). See the vault's [[Project World Definitions]].
- **Audio:** opt-in Web Audio system created after the entry gate (no autoplay) — wind, an ambient
  synth layer, and story-beat swells.
- **Entry gate** (`ui/LoadGate.jsx`): a real `<button>` that supplies the user gesture, covers
  loading, and fades away to reveal the experience.

### Design language

- **Theme:** the climb from beginner to professional — "the experience is about continuing the
  climb." Calm, reflective, hopeful.
- **Type:** display = Georgia serif; body = system-ui sans (design tokens in `src/index.css`).
- **Styling:** plain CSS + custom properties (`--bg`, `--ink`, `--muted`, `--accent`, fonts). No
  Tailwind, no CSS-in-JS.
- **Motion:** scroll-driven throughout; `prefers-reduced-motion` honored everywhere (camera drift,
  card tilt/parallax, the pull-out morph, and atmosphere plates all degrade gracefully).

## What works

- Live, deployed, auto-building from `main`; production `npm run build` passes.
- Accessibility baked into the new UI: semantic `<button>`s, focus traps + visible focus, AA
  contrast over the scrim, 44px targets, reduced-motion fallbacks.
- No dead links: concept projects open a modal / are non-links; only the live project links out
  (`rel="noreferrer noopener"`).

## Honest gaps (post-launch)

- **Performance + mobile not yet verified** against the Phase-1 bar (Lighthouse 75+, < 3s on 3G,
  320–1200px). The five work-section films are the main risk — posters + in-view-only playback
  mitigate, but measure it.
- **`hello@khaylub.com`** mailbox — confirm it exists and receives (the contact link depends on it).
- A full **WCAG AA audit** of the live build (keyboard over the canvas, traps) is still pending.
- The parked Growth-Ledger prep renames project `theme → tags`; the merged work section uses
  `theme` — reconcile before that prep lands.

## Pointers

- Live checklist + deferred work: the vault's `TODO — Launch + Growth Ledger`
- Store ownership (repo vs Obsidian vault): `SOURCE_OF_TRUTH.md`
- Architecture + idioms for contributors: `CLAUDE.md`
- Narrative/design decisions are developed in the Obsidian vault `01 Projects/Khaylub.com/`.
