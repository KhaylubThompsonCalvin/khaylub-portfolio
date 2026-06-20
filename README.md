# Khaylub.com — The Wanderer Experience

A scroll-driven 3D portfolio. One hero character (the Wanderer) stays constant while
everything transforms around him across a single continuous timeline. Built for recruiter
clarity first, cinematic feel second.

Governed by three docs in the Obsidian vault: `CLAUDE.md` (vault rules), the Engineering
Constitution (code rules), and the **Experience Architect Master Prompt** (experience rules).

## Stack

- **React + Vite** — app shell and build
- **React Three Fiber + Three.js** — the 3D stage (the Wanderer, camera, effects)
- **Zustand** — single source of truth (`scrollProgress` 0\u21921, current stage)
- **Lenis** — smooth scroll (feeds the store). GSAP ScrollTrigger layers on in Phase 3.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # -> dist/
npm run preview
```

On first run, open the browser console: the Wanderer loader prints the GLB's animation
clips (e.g. `[Wanderer] GLB animation clips: [...]`). That confirms whether Walk/Idle made
it into the export — our deferred Blender check.

## Structure

```
index.html                 entry
public/assets/models/       wanderer-web.glb (desktop hero asset)
src/
  main.jsx · App.jsx        mount + composition
  index.css                 global styles
  store/useExperience.js    Zustand: scrollProgress + stage (single source of truth)
  scroll/useScrollSetup.js  Lenis -> store (GSAP timeline added Phase 3)
  data/                     copy.js · projects.js · stages.js  (content, edit here)
  three/                    Scene · Wanderer · CameraRig · Atmosphere
  ui/                       LoadGate · Nav · Hero · Sections · ProjectCards · Contact · SkipToWork
```

## Phase status

- [x] **Phase 0 — Skeleton**: structure, store, data, scroll wiring, GLB loads + self-verifies.
- [ ] Phase 1 — frame the Wanderer, replace OrbitControls with the camera rig.
- [ ] Phase 2 — scrub the walk by scrollProgress; stage-driven character state.
- [ ] Phase 3 — GSAP ScrollTrigger master timeline (camera keys, reveals).
- [ ] Phase 4 — Higgsfield atmosphere plates; dynamic project cards.
- [ ] Phase 5 — polish, reduced-motion + no-WebGL fallback, deploy.

The static site in `website/` is retained as the no-WebGL fallback.
