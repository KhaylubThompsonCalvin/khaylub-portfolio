# Khaylub.com — Architecture

> Status: Pre-development planning document. No code exists yet.

## Overview

Khaylub.com is an interactive portfolio website where the primary experience is driven by 3D assets authored in Blender and served on the web as compressed GLB models. The site layers standard HTML UI (navigation, project cards, copy) over or alongside a WebGL canvas rendered via React Three Fiber.

```
┌─────────────────────────────────────────────────────────┐
│  Browser                                                │
│  ┌───────────────────────────────────────────────────┐  │
│  │  HTML UI layer (Nav, text, project grid, contact) │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  WebGL canvas (React Three Fiber / Three.js)      │  │
│  │    ← GLB models from assets/models/               │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Design Principles

1. **Blender is the source of truth** — all hero and project 3D content originates in `.blend` files; the web only consumes exported GLBs.
2. **3D where it matters** — heavy WebGL on the landing hero and selected case studies; static images elsewhere for performance.
3. **Content-driven growth** — new projects are added via data files (JSON/MDX), not by editing scene code.
4. **Mobile-aware** — every 3D experience has a static image or lighter-model fallback.
5. **Document before code** — each phase has written requirements and acceptance criteria before implementation begins.

## Tech Stack

| Layer | Technology | Version (target) | Role |
|-------|-----------|------------------|------|
| Framework | Next.js | 15.x | Routing, SSR/SSG, metadata, deploy |
| Language | TypeScript | 5.x | Type safety across app and content |
| 3D runtime | React Three Fiber | 8.x | React renderer for Three.js |
| 3D helpers | @react-three/drei | latest | OrbitControls, Environment, useGLTF, etc. |
| 3D engine | Three.js | via R3F | WebGL rendering |
| Model format | glTF 2.0 / GLB | — | Blender export target |
| Compression | Draco (gltf-pipeline or Blender plugin) | — | Reduce transfer size |
| Styling | Tailwind CSS | 4.x | Layout, typography, responsive UI |
| Content | JSON + optional MDX | — | Project metadata and case study copy |
| Deploy | Vercel | — | CDN, preview deploys, domain binding |

## Repository Layout (target)

```
Khaylub.com/
├── assets/
│   ├── blender/              # Source .blend files (not deployed)
│   │   └── hero/
│   ├── models/               # Exported GLB/GLTF (source of truth for web)
│   │   └── hero/
│   ├── textures/             # Standalone PBR maps if not embedded
│   └── brand/                # Logo, favicon, OG images, fonts
├── docs/                     # This folder
├── references/
│   └── inspiration/          # Screenshots, links, mood boards
└── website/                  # Next.js application (Phase 1+)
    ├── public/
    │   └── models/           # GLBs copied/symlinked for serving
    └── src/
        ├── app/              # Next.js App Router pages
        │   ├── layout.tsx
        │   ├── page.tsx              # Landing — hero 3D scene
        │   ├── work/
        │   │   ├── page.tsx          # Project grid
        │   │   └── [slug]/page.tsx   # Case study
        │   └── about/page.tsx
        ├── components/
        │   ├── canvas/         # R3F scene components
        │   │   ├── Scene.tsx
        │   │   ├── HeroModel.tsx
        │   │   └── Lighting.tsx
        │   └── ui/             # HTML overlay components
        │       ├── Nav.tsx
        │       ├── ProjectCard.tsx
        │       └── ContactSection.tsx
        ├── content/
        │   └── projects.json   # Project metadata
        └── lib/
            └── loadModel.ts    # Model loading helpers
```

## Data Flow

```
Blender (.blend)
    │
    ▼  export (see blender-export-pipeline.md)
assets/models/*.glb
    │
    ▼  copy or symlink
website/public/models/*.glb
    │
    ▼  useGLTF / GLTFLoader
React Three Fiber scene
    │
    ▼  render
Browser WebGL canvas
```

### Content model (Phase 2+)

Each project entry in `content/projects.json`:

```json
{
  "slug": "project-name",
  "title": "Project Name",
  "description": "Short summary for cards.",
  "tags": ["3D", "motion"],
  "thumbnail": "/images/projects/project-name.jpg",
  "model": "/models/projects/project-name.glb",
  "featured": true,
  "year": 2026
}
```

The `model` field is optional — only featured or case-study projects need an embedded 3D viewer.

## Page Architecture

### Landing (`/`)

- Full-viewport WebGL canvas with the hero GLB
- HTML overlay: name, tagline, primary nav
- Interaction: orbit controls (desktop), auto-rotate or touch-drag (mobile)
- Optional: scroll-linked camera animation (Phase 4)

### Work (`/work`)

- Static 2D project grid from `projects.json`
- Thumbnail, title, tags per card
- No WebGL on the index page (performance)

### Case study (`/work/[slug]`)

- Hero image or embedded 3D viewer (if `model` is set)
- Markdown/MDX body: process, tools, outcome
- Prev/next navigation between projects

### About / Contact

- Standard HTML sections
- Contact: email link or form service (Phase 3)

## Interaction Model

| Surface | Desktop | Mobile |
|---------|---------|--------|
| Hero canvas | Mouse orbit + scroll | Touch drag + auto-rotate |
| Project grid | Hover states on cards | Tap to open case study |
| Case study 3D | Orbit if model present | Static fallback image |
| Navigation | Fixed top nav | Hamburger or bottom bar |

## Performance Budget

| Asset | Target |
|-------|--------|
| Hero GLB (Draco-compressed) | ≤ 5 MB |
| Per-project GLB | ≤ 3 MB |
| First Contentful Paint | < 2 s on broadband |
| Time to interactive (hero) | < 3 s on broadband |
| Lighthouse Performance | ≥ 80 (Phase 3 target) |

Strategies:
- Draco-compress all GLBs before deploy
- Lazy-load 3D viewers on case study pages (not the landing hero)
- Serve models from Vercel CDN with long cache headers
- Provide `prefers-reduced-motion` and low-power fallbacks

## Deployment Architecture

```
Git push → Vercel build → CDN edge
                │
                ├── Static pages (SSG)
                ├── public/models/*.glb
                └── public/images/*

Domain: khaylub.com → Vercel DNS (Phase 3)
```

No backend is required for Phase 1–3. A contact form (if added) can use a serverless function or a third-party service (Formspree, Resend).

## Security & Licensing

- No user authentication in v1
- No API keys in client-side code
- `.blend` source files stay in `assets/blender/` and are never deployed
- Third-party textures/models in `references/` must be license-checked before use in production assets

## Open Decisions

| Decision | Options | Resolve by |
|----------|---------|------------|
| Scroll-driven camera | Custom R3F hook vs. pre-baked animation clips | Phase 4 planning |
| Contact form | mailto link vs. Formspree vs. serverless | Phase 3 |
| Case study format | JSON only vs. MDX with components | Phase 2 start |
| Model copy strategy | Manual copy vs. build script symlink | Phase 1 implementation |

## Related Documents

- [build-plan.md](build-plan.md) — phased delivery timeline
- [blender-export-pipeline.md](blender-export-pipeline.md) — export settings and naming
- [phase-1-requirements.md](phase-1-requirements.md) — first deliverable acceptance criteria
