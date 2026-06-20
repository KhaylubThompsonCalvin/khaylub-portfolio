# Khaylub.com — Documentation Consolidation Report

> Generated to reconcile existing documentation with the **actual working site** in `website/`.
> Decision applied: the static `website/` build is the **active implementation**. The React Three Fiber / Next.js documents are **long-term reference**, not current requirements.
> No files were deleted. No website code was changed. No new architecture was introduced.

## The core conflict

Two pictures of Khaylub.com existed side by side:

- **The `docs/` planning set** describes a Next.js 15 + React Three Fiber app serving Blender-exported GLB models, deployed to Vercel, styled with Tailwind, with `website/` "intentionally empty until Phase 1."
- **The `website/` folder** is a finished, working **static site**: vanilla HTML/CSS/JS, a CSS-only mountain scene with an animated traveler, loader, and five sections (Hero, About, Projects, Journey, Contact). No Next.js, no R3F, no GLB, no Tailwind.

Per your decision, the static site wins as the present truth. The R3F documents are not wrong — they are a **future** target. This report files each document accordingly.

## 1. Documents that reflect the current website

| Document | Relationship to live site | Action |
|----------|---------------------------|--------|
| `website/index.html` | The site itself | Maintain |
| `website/styles.css` | The site itself | Maintain |
| `website/script.js` | The site itself | Maintain |
| `README.md` | Mostly accurate intent, but "Current Status" and "Tech Stack" describe the R3F plan, not the static build | Keep, but treat `CURRENT_STATE.md` as the authority on what exists today |

There is currently **no prose document** that accurately describes the static site. `CURRENT_STATE.md` (new, created alongside this report) fills that gap.

## 2. Documents that reflect future Phase 2 / Phase 3 goals

These remain valuable as a roadmap. They are reference material, not a description of today.

| Document | Why it's future, not current |
|----------|------------------------------|
| `docs/architecture.md` | Specifies Next.js + R3F + GLB + Vercel + Tailwind. None of this is in the live site. This is the long-term migration target. |
| `docs/build-plan.md` | Phase 2–4 content (project JSON schema, case studies, scroll cameras, hotspots) is genuine future scope. Its Phase 1 section is obsolete — Phase 1 already shipped as a static site by a different route. |
| `docs/blender-export-pipeline.md` | The GLB export workflow only matters once R3F is adopted. Valuable for the Blender roadmap, but not needed by the current site. |

`FUTURE_VISION.md` (new) gathers the genuinely forward-looking ideas into one place so these source docs can be read as background.

## 3. Documents that are obsolete

Nothing is deleted, but these contain claims that are factually untrue of the project as it stands:

| Document | Obsolete element |
|----------|------------------|
| `docs/phase-1-requirements.md` | Entire premise — "no website code until pre-code items complete," "hero is a GLB in a WebGL canvas," "website/ contains only the Next.js project." A static Phase 1 already exists. This document describes a Phase 1 that was never executed. |
| `README.md` (sections only) | "Website code: Not started — `website/` intentionally empty" and the planned Next.js/Vercel/Tailwind stack table. The status line is the obsolete part; the vision and roadmap framing are still fine. |

`phase-1-requirements.md` is the one document that is wholly superseded. Archived.

## 4. Documents that should be archived

Moved to `docs/archive/`. Kept verbatim for historical reference and possible future revival, but pulled out of the active `docs/` reading path so they stop competing with the live site as "truth."

| Document | Destination | Reason |
|----------|-------------|--------|
| `docs/phase-1-requirements.md` | `docs/archive/phase-1-requirements.md` | Describes an unexecuted GLB-based Phase 1; fully superseded by the shipped static site. |

`architecture.md`, `build-plan.md`, and `blender-export-pipeline.md` are **not** archived — they stay in `docs/` as the cited reference behind `FUTURE_VISION.md`, since their content is still the intended long-term direction.

## Resulting documentation structure

```
Khaylub.com/
├── README.md                         # Intent + roadmap (status section now deferred to CURRENT_STATE.md)
├── docs/
│   ├── CONSOLIDATION_REPORT.md        # This file
│   ├── CURRENT_STATE.md               # NEW — authoritative description of the live static site
│   ├── FUTURE_VISION.md               # NEW — consolidated forward roadmap
│   ├── WANDERER_PRODUCTION_ROADMAP.md # NEW — Blender-only, student-paced plan
│   ├── architecture.md                # Reference — long-term R3F target
│   ├── build-plan.md                  # Reference — Phase 2-4 scope
│   ├── blender-export-pipeline.md     # Reference — GLB workflow for future R3F
│   └── archive/
│       └── phase-1-requirements.md    # Archived — superseded Phase 1 premise
└── website/                           # ACTIVE — the working static site (unchanged)
```

## One follow-up worth noting

`README.md` still tells visitors the site is unbuilt and Next.js-based. It is left unedited per "do not rewrite," but its "Current Status" and "Tech Stack" sections now disagree with reality. When you're ready, the minimal honest fix is to point those two sections at `CURRENT_STATE.md`. Flagging only — not changing it.
