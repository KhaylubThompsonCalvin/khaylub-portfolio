# Khaylub.com — Build Plan

> Phased delivery from empty scaffold to live portfolio. Each phase has a defined goal, deliverables, and exit criteria. Do not start a phase until the previous phase's exit criteria are met.

## Phase Overview

```
Phase 1 ──► Phase 2 ──► Phase 3 ──► Phase 4 (ongoing)
  │            │            │              │
  Hero 3D    Content      Deploy &       Signature
  landing    shell        polish         interactions
```

| Phase | Timeline (estimate) | Goal                                    |
| ----- | ------------------- | --------------------------------------- |
| **1** | Week 1              | One page, one interactive 3D model      |
| **2** | Week 2              | Portfolio structure without advanced 3D |
| **3** | Week 3              | Public site at khaylub.com              |
| **4** | Ongoing             | Differentiating interactions and polish |

---

## Phase 1 — Foundation

**Goal:** Prove the Blender → web pipeline with a single landing page and hero model.

**Prerequisites (documentation only — current phase):**

- [x] Project scaffold
- [x] Architecture document
- [x] Blender export pipeline document
- [x] Phase 1 requirements document
- [ ] Hero `.blend` file created in `assets/blender/hero/`
- [ ] Hero `.glb` exported to `assets/models/hero/`

**Implementation deliverables:**

- [ ] `website/` initialized (Next.js + TypeScript + Tailwind + R3F)
- [ ] Hero GLB loads in a full-viewport canvas
- [ ] Orbit controls work on desktop
- [ ] HTML overlay: site name, tagline, placeholder nav
- [ ] `npm run dev` serves the page locally
- [ ] Git repository initialized with `.gitignore`

**Exit criteria:**

- Landing page loads locally in under 3 seconds on broadband
- Hero model renders correctly with lighting
- README updated to reflect Phase 1 complete

**Detailed requirements:** [phase-1-requirements.md](phase-1-requirements.md)

---

## Phase 2 — Content Shell

**Goal:** Portfolio structure that can hold real projects, without advanced 3D interactions.

**Deliverables:**

- [ ] `content/projects.json` schema defined and populated with 2–3 placeholder entries
- [ ] `/work` — project grid page with thumbnails, titles, tags
- [ ] `/work/[slug]` — case study template (text + images; 3D viewer optional)
- [ ] `/about` — bio and skills section
- [ ] Contact section (email link or placeholder)
- [ ] Brand assets in `assets/brand/` (logo, favicon)
- [ ] `docs/content-model.md` documenting the project JSON schema

**Exit criteria:**

- All routes navigable via top nav
- Adding a new project requires only editing `projects.json` and dropping assets — no scene code changes
- Site is usable end-to-end with placeholder content

---

## Phase 3 — Polish & Deploy

**Goal:** Production-ready site live at khaylub.com.

**Deliverables:**

- [ ] Draco-compress all GLBs; verify file sizes meet budget (see architecture.md)
- [ ] Mobile fallback: static hero image when WebGL unavailable or `prefers-reduced-motion`
- [ ] SEO: page titles, meta descriptions, OG images per route
- [ ] Lighthouse Performance ≥ 80 on landing page
- [ ] Vercel project created; preview deploys on push
- [ ] Domain `khaylub.com` pointed to Vercel
- [ ] 2–3 real projects with final thumbnails and case study copy
- [ ] Contact method finalized (mailto or form service)

**Exit criteria:**

- `https://khaylub.com` serves the landing page over HTTPS
- Site passes basic accessibility check (keyboard nav, alt text, contrast)
- No GLB exceeds performance budget

---

## Phase 4 — Signature Interactions (ongoing)

**Goal:** Features that make the site feel authored and memorable, not generic.

**Candidate features (prioritize after Phase 3 launch):**

| Feature                | Description                                          | Complexity |
| ---------------------- | ---------------------------------------------------- | ---------- |
| Scroll-driven camera   | Camera path animated on scroll, authored in Blender  | High       |
| Clickable hotspots     | Interactive points on hero model linking to projects | Medium     |
| Per-project 3D viewers | Embedded GLB on case study pages                     | Medium     |
| Page transitions       | Animated crossfade between routes                    | Medium     |
| Custom shaders         | Match Blender look-dev in WebGL                      | High       |
| Audio ambient          | Subtle soundscape on landing (opt-in)                | Low        |
| Loading sequence       | Branded preloader while GLB downloads                | Low        |

**Process:** Pick one feature at a time. Write a short spec in `docs/` before implementing. Ship to preview deploy before merging.

---

## Cross-Phase Checklist

Tasks that span multiple phases:

| Task                          | Phase        | Status      |
| ----------------------------- | ------------ | ----------- |
| Create hero Blender scene     | 1 (pre-code) | Not started |
| Export hero GLB               | 1 (pre-code) | Not started |
| Initialize Next.js project    | 1            | Not started |
| Define project content schema | 2            | Not started |
| Create brand assets           | 2            | Not started |
| Draco compression pipeline    | 3            | Not started |
| Domain DNS setup              | 3            | Not started |
| Real portfolio content        | 3            | Not started |

## Risk Register

| Risk                              | Impact                            | Mitigation                                                       |
| --------------------------------- | --------------------------------- | ---------------------------------------------------------------- |
| Hero GLB too large (> 5 MB)       | Slow load, poor mobile experience | Draco compress; reduce polyhcount; bake textures                 |
| Blender materials don't translate | Model looks wrong in browser      | Test early export; use glTF-compatible shaders (Principled BSDF) |
| WebGL unsupported on device       | Blank hero area                   | Static image fallback in Phase 3                                 |
| Scope creep in Phase 1            | Delays first shippable page       | Strict acceptance criteria in phase-1-requirements.md            |
| Content bottleneck                | Site launches with placeholders   | Write copy in parallel with Phase 2 build                        |

## Related Documents

- [architecture.md](architecture.md) — system design and tech stack
- [blender-export-pipeline.md](blender-export-pipeline.md) — asset export workflow
- [phase-1-requirements.md](phase-1-requirements.md) — Phase 1 acceptance criteria
