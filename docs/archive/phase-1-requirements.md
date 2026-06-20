# Phase 1 Requirements

> Acceptance criteria and deliverables for the first shippable version of Khaylub.com. **No website code should be written until every "Pre-code" item below is complete.**

## Phase 1 Goal

Deliver a single landing page that loads one Blender-exported GLB model in an interactive full-viewport 3D canvas, with a minimal HTML overlay (name, tagline, nav). This proves the Blender → GLB → React Three Fiber pipeline end-to-end.

## Scope

### In scope

- One hero GLB model (placeholder art is acceptable)
- Full-viewport 3D canvas on the landing page
- Orbit controls on desktop (mouse drag to rotate, scroll to zoom)
- Basic lighting in code (not baked from Blender)
- HTML overlay: site title, one-line tagline, placeholder navigation links
- Local dev server (`npm run dev`)
- Git repo with `.gitignore`

### Out of scope (deferred to later phases)

- Additional routes (`/work`, `/about`, case studies)
- Project content system (`projects.json`)
- Mobile-specific fallback image
- Draco compression
- Production deployment
- Scroll-driven camera animation
- Clickable hotspots on the model
- Contact form
- SEO metadata beyond a page title
- Brand logo / favicon (placeholder text is fine)

## Pre-Code Deliverables

These must be complete **before** initializing the Next.js project.

| # | Deliverable | Location | Status |
|---|-------------|----------|--------|
| 1 | Architecture document | `docs/architecture.md` | Done |
| 2 | Build plan | `docs/build-plan.md` | Done |
| 3 | Blender export pipeline | `docs/blender-export-pipeline.md` | Done |
| 4 | Phase 1 requirements (this file) | `docs/phase-1-requirements.md` | Done |
| 5 | Updated README | `README.md` | Done |
| 6 | Hero Blender scene | `assets/blender/hero/hero-scene.blend` | **Not started** |
| 7 | Hero GLB export | `assets/models/hero/hero-scene.glb` | **Not started** |
| 8 | Export validation | glTF viewer — zero errors | **Not started** |
| 9 | Export log | `assets/models/hero/export-log.md` | **Not started** |

### Hero asset requirements

| Requirement | Target |
|-------------|--------|
| Format | GLB (glTF 2.0 binary) |
| File size | ≤ 5 MB (uncompressed) |
| Triangle count | ≤ 100,000 |
| Materials | Principled BSDF with baked textures |
| Animation | None |
| Lighting in file | None — lighting handled in code |
| Naming | `hero-scene.glb` in `assets/models/hero/` |

## Implementation Deliverables

These are built **after** pre-code items 6–9 are complete.

| # | Deliverable | Details |
|---|-------------|---------|
| 1 | Next.js project scaffold | TypeScript, App Router, Tailwind CSS |
| 2 | R3F dependencies | `three`, `@react-three/fiber`, `@react-three/drei` |
| 3 | Hero model in public dir | `website/public/models/hero/hero-scene.glb` |
| 4 | Canvas scene component | Loads GLB via `useGLTF`, renders with lighting |
| 5 | Landing page | Full-viewport canvas + HTML overlay |
| 6 | Orbit controls | `OrbitControls` from drei — enable rotate and zoom, disable pan |
| 7 | Responsive canvas | Canvas fills viewport on 1920×1080 and 390×844 |
| 8 | Placeholder nav | Links to `#` for Work, About, Contact |
| 9 | `.gitignore` | Excludes `node_modules/`, `.next/`, `.env*` |
| 10 | README status update | Mark Phase 1 implementation complete |

## Acceptance Criteria

All must pass before Phase 1 is considered complete.

### Asset

- [ ] `assets/blender/hero/hero-scene.blend` exists and opens in Blender
- [ ] `assets/models/hero/hero-scene.glb` exists and is ≤ 5 MB
- [ ] GLB validates with zero errors in glTF viewer
- [ ] Export log filled out in `assets/models/hero/export-log.md`

### Application

- [ ] `npm run dev` starts without errors
- [ ] Landing page renders the hero model in a full-viewport canvas
- [ ] Model is lit and visually recognizable (not black/unlit)
- [ ] Mouse drag rotates the model; scroll zooms in/out
- [ ] HTML overlay displays site name and tagline above the canvas
- [ ] Placeholder nav links are visible and styled
- [ ] Page loads in under 3 seconds on a broadband connection (model cached excluded)
- [ ] No console errors related to model loading or WebGL

### Repository

- [ ] Git initialized with meaningful initial commit
- [ ] `.gitignore` present; `node_modules/` not tracked
- [ ] `website/` folder contains only the Next.js project (no stray files)

## Visual Reference (wireframe)

```
┌──────────────────────────────────────────────────┐
│  KHAYLUB          Work   About   Contact       │  ← HTML nav overlay
│                                                  │
│                                                  │
│              ┌──────────────┐                    │
│              │              │                    │
│              │  3D Hero     │                    │  ← WebGL canvas
│              │  Model       │                    │     (full viewport)
│              │              │                    │
│              └──────────────┘                    │
│                                                  │
│  Creative portfolio — interactive 3D             │  ← Tagline overlay
└──────────────────────────────────────────────────┘
```

## Technical Constraints

| Constraint | Value |
|------------|-------|
| Node.js | ≥ 18 |
| Package manager | npm (default; pnpm acceptable if noted in README) |
| Browser targets | Latest Chrome, Firefox, Safari, Edge |
| Canvas renderer | WebGL via React Three Fiber |
| No external APIs | Phase 1 has no backend or third-party services |
| No environment variables | Nothing requiring `.env` in Phase 1 |

## Suggested Implementation Order

Once pre-code deliverables are done:

1. `npx create-next-app@latest website` with TypeScript, Tailwind, App Router
2. Install `three @react-three/fiber @react-three/drei` and types
3. Copy `assets/models/hero/hero-scene.glb` → `website/public/models/hero/`
4. Create `src/components/canvas/HeroScene.tsx` — Canvas, lights, OrbitControls, useGLTF
5. Create `src/app/page.tsx` — full-viewport layout with overlay UI
6. Verify locally, fix materials/lighting if model appears wrong
7. Initialize git, commit, update README status

## Definition of Done

Phase 1 is **done** when:

1. All pre-code deliverables (items 1–9) are checked off
2. All acceptance criteria pass
3. README `Current Status` section reflects "Phase 1 complete"
4. Build plan Phase 1 exit criteria are met

At that point, proceed to [Phase 2 in build-plan.md](build-plan.md).

## Related Documents

- [architecture.md](architecture.md) — tech stack and folder layout
- [blender-export-pipeline.md](blender-export-pipeline.md) — how to create the hero GLB
- [build-plan.md](build-plan.md) — what comes after Phase 1
