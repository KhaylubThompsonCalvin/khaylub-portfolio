# Khaylub.com — Future Vision

> Forward-looking roadmap. **Nothing here is a current build requirement.** The live site (see `CURRENT_STATE.md`) is a zero-dependency static page; everything below is where it could grow.
> Reference sources retained in `docs/`: `architecture.md`, `build-plan.md`, `blender-export-pipeline.md`.
> Items are tagged **[Reference doc]** when they come from existing planning files, or **[Concept]** when they are creative direction not yet specified anywhere else.

## Guiding principle

Grow the site **without throwing away what works**. The static build can carry real content for a long time. 3D and a framework migration are upgrades to earn, not prerequisites. Every future 3D experience must keep a static fallback so the site never depends on WebGL to be usable.

---

## Wanderer roadmap **[Concept]**

The live site already has a flat, CSS animated "traveler" silhouette in the hero. The Wanderer is the 3D evolution of that character — the same protagonist, realized as an actual Blender model that can eventually replace the CSS figure and recur across the site as a guide.

Stages:

1. **Character** — finish the Wanderer model (stylized proportions, clean topology suitable for eventual game-style export).
2. **Clothing & gear** — jacket, boots, glasses, and the backpack fitted to the body.
3. **Rig** — a working deform rig for body and limbs; face/finger detail is optional and lowest priority.
4. **Animation** — at minimum an idle and a walk cycle, echoing the hero's walking silhouette.
5. **Web presence** — exported and shown on the site, first as a rendered image, later as an interactive model (see R3F roadmap).

The detailed, dependency-ordered, student-paced plan for this lives in `WANDERER_PRODUCTION_ROADMAP.md`.

---

## Blender integration roadmap **[Reference doc: blender-export-pipeline.md]**

How Blender work reaches the website, in increasing order of effort:

1. **Static renders first.** The cheapest win: render the Wanderer or a scene to an image and use it on the site (e.g. behind a project card or the hero). No framework change required — the current static site can display images today.
2. **GLB export pipeline.** When interactivity is wanted, adopt the documented workflow: model in `.blend`, export glTF Binary (+Y up, Principled BSDF, baked textures, apply transforms), validate in a glTF viewer, keep files within the performance budget (hero ≤ 5 MB).
3. **Draco compression.** Compress GLBs before any production deploy to cut transfer size 60–90%.
4. **Naming & foldering.** kebab-case, source `.blend` in `assets/blender/`, exports in `assets/models/`, served copies in the site's public path.

The pipeline doc is the authority on settings; this roadmap only sequences when each step becomes relevant.

---

## React Three Fiber roadmap **[Reference doc: architecture.md]**

The long-term target architecture, to be adopted **only when a static page genuinely can't deliver the desired experience** (i.e. interactive 3D). This is a migration, not a rewrite-on-a-whim.

Sequence:

1. **Trigger condition.** Pursue R3F when the Wanderer model exists, animates, and there's a clear interaction (orbit, scroll camera, or hotspots) that images can't fake.
2. **Stack.** Next.js 15 (App Router) + TypeScript + React Three Fiber + drei + Tailwind, deployed on Vercel — as specified in `architecture.md`.
3. **First milestone.** Reproduce the current landing experience with a full-viewport canvas loading the hero GLB, orbit controls on desktop, touch-drag/auto-rotate on mobile, and the existing static scene as the no-WebGL fallback.
4. **Content system.** Move projects into `projects.json`; optional per-project GLB viewers on case-study pages.
5. **Signature interactions (latest).** Scroll-driven camera, clickable hotspots on the model, page transitions.

Until the trigger condition is met, the static site remains the product and R3F stays on the shelf.

---

## Backpack portal concept **[Concept]**

The Wanderer's backpack as an interactive "portal" into the work — a signature interaction that ties the character to the portfolio.

- **Idea:** clicking/tapping the backpack opens it, and projects emerge from inside it as if pulled from the pack — reinforcing the "everything I carry / everything I've made" metaphor.
- **Static-era version:** a non-interactive render of the Wanderer with the open pack, projects laid out beside it. Achievable on the current static site with an image.
- **Interactive version:** depends on the R3F roadmap — the pack becomes a clickable hotspot on the live model that triggers the project reveal.
- **Dependencies:** requires the backpack modeled and fitted (Wanderer roadmap step 2) before any version is meaningful.

This is the kind of feature the R3F architecture's "clickable hotspots" entry was built to enable.

---

## Seasonal journey concept **[Concept]**

Extend the single "Toward the Summit" scene into a journey through **four seasonal environments**, matching the site's "journey" theme and the existing Spring prototype work.

- **Spring** — the starting environment; green growth, dirt path, the prototype already explored in Blender.
- **Summer** — fuller foliage, warmer/higher light, lush.
- **Fall** — warm palette shift, falling leaves, lower sun.
- **Winter** — snow, bare trees, cold light, the summit approach.

Possible expressions, cheapest to richest:

1. **Rendered backdrops.** Four images swapped behind sections or as the hero changes — works on the current static site.
2. **Scroll-linked season.** As the visitor scrolls the "Journey" timeline, the environment transitions season by season (CSS today; R3F later for 3D depth).
3. **Full 3D seasons.** Four GLB scene variants the Wanderer walks through (R3F era).

Each season is an independent Blender deliverable, which is why the production roadmap treats them as a sequence after the character is complete.

---

## How these connect

```
Wanderer character ─┬─► clothing/backpack ─┬─► rig ─► animation ─► Spring scene ─► Summer/Fall/Winter
                    │                      │
                    │                      └─► Backpack portal (needs pack modeled)
                    │
                    └─► first static render on the live site (no framework change)

Static renders ───────────────────────► Seasonal backdrops (static site)
        │
        └─ when interaction is needed ─► GLB export ─► R3F/Next.js migration ─► interactive Wanderer + hotspots + scroll seasons
```

The throughline: **the character comes first**, static renders deliver value early, and the React Three Fiber migration is the last and largest step — justified only once there's animated 3D worth making interactive.
