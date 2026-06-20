# Wanderer Production Roadmap

> Blender-only work extracted from `FUTURE_VISION.md`, ordered by dependency and paced for a student learning Blender at **~1 hour per day**.
> Scope is Blender deliverables: the character, its gear, rig, animation, and the four seasonal scenes. Website integration (renders, GLB export, React Three Fiber) is out of scope here — it begins only after these assets exist.

## How to read this

Stages are strictly dependency-ordered: each one needs the previous one finished. Don't jump ahead — a rig built on unfinished geometry, or a scene built around an unanimated character, creates rework that costs far more than the hour it seemed to save.

Time is given as **focused hours** and a **calendar estimate at 1 hr/day**. Real days off, school load, and learning detours will stretch these. That's expected. The order matters more than the dates.

**The golden rule for a 1-hour day:** end each session at a natural stopping point and save a new version (`wanderer-v02.blend`, `-v03`...). Never leave the file mid-operation. One hour is enough to finish one small, well-chosen task.

---

## Dependency chain at a glance

```
1. Character body
        │
2. Clothing  ──►  3. Backpack
        │              │
        └──────┬───────┘
               ▼
4. Rigging
               │
5. Animation (idle → walk)
               │
6. Spring scene  ──►  7. Summer  ──►  8. Fall  ──►  9. Winter
```

Stages 1→5 build the character. Stages 6→9 reuse that finished, animated character in four environments. Spring is first because it's the prototype already started and it shakes out scene problems before the other three repeat them.

---

## Stage 1 — Character completion

**Goal:** a finished, clean Wanderer body mesh you're willing to build everything else on.

**Why first:** every later stage deforms, dresses, or poses this mesh. Topology problems here multiply everywhere downstream.

**Tasks (one per session or so):**
- Lock silhouette and proportions; stop tweaking shape once approved.
- Resolve topology: clean edge flow at shoulders, hips, knees, elbows (the areas that will bend).
- Confirm the mesh is watertight; remove doubles, stray verts, hidden faces.
- Apply all transforms (scale 1.0, rotation 0).
- Shade smooth; fix any shading artifacts.
- Block in base materials (Principled BSDF only — keeps every future option open).
- Save as a clean `wanderer-body-final.blend`.

**Focused hours:** 12–18 · **At 1 hr/day:** ~3 weeks

**Done when:** proportions are locked, topology is clean at every joint, transforms applied, mesh watertight, base materials assigned.

---

## Stage 2 — Clothing completion

**Goal:** jacket, boots, glasses fitted to the finished body.

**Depends on:** Stage 1 (clothing is shaped to the final body; if the body changes later, clothing refits).

**Tasks:**
- Jacket: model to the torso, centered on the spine, correct width and length.
- Boots: model and orient correctly to the feet (watch foot/toe direction).
- Glasses: size and seat on the nose bridge at eye height.
- Keep each garment a separate object, cleanly named.
- Principled BSDF materials; apply transforms on each.
- Check for clipping against the body in the rest pose.

**Focused hours:** 10–15 · **At 1 hr/day:** ~2–3 weeks

**Done when:** all garments fit in rest pose without clipping, are separate named objects, and have transforms applied.

---

## Stage 3 — Backpack completion

**Goal:** the backpack modeled and seated against the back.

**Depends on:** Stages 1–2 (sits on the body, over the jacket). Called out separately because it is the asset the **Backpack portal concept** in `FUTURE_VISION.md` depends on — it deserves more care than a generic prop.

**Tasks:**
- Model the pack body, straps, and any flap/opening.
- Position so it contacts the back surface (no floating, no sinking).
- If the portal concept matters to you later, model the opening as a distinct part now so it can animate/open in the future.
- Separate named object; Principled BSDF; transforms applied.

**Focused hours:** 6–10 · **At 1 hr/day:** ~1.5–2 weeks

**Done when:** the pack sits believably on the back over the jacket, straps read correctly, and the opening is its own selectable part.

---

## Stage 4 — Rigging

**Goal:** a working deform rig for body and limbs.

**Depends on:** Stages 1–3 — rig the **finished, dressed** character so weights are painted once against final geometry.

**Tasks:**
- Build/confirm the armature; sensible bone names.
- Parent body with automatic weights, then **weight-paint the joints by hand**: shoulders, elbows, hips, knees, ankles.
- Decide how clothing follows the body (parent to bones, or its own weights).
- Test extreme poses for each joint; fix pinching and collapse.
- Keep it simple: body + limbs first. **Face and finger rigs are optional and lowest priority** — skip them for the first pass.

**Focused hours:** 15–20 · **At 1 hr/day:** ~3–4 weeks

**Done when:** every major joint deforms cleanly through its range, clothing follows the body, and a quick test pose holds up.

---

## Stage 5 — Animation (idle → walk)

**Goal:** two clips — a subtle idle and a believable walk cycle.

**Depends on:** Stage 4 — you can only animate what deforms correctly.

**Tasks:**
- **Idle first** (easier): gentle breathing/weight shift, looping. Learn the graph editor and looping here on something low-stakes.
- **Walk cycle** (harder): contact → passing → recoil poses, then refine. This is the clip that echoes the website hero's walking traveler.
- Watch the known risk areas: back-of-knee deformation, and arm-vs-backpack clearance at full stride.
- Name actions clearly (`idle`, `walk`); keep clips short and looping.

**Focused hours:** 20–30 (walk cycles are a genuine learning curve) · **At 1 hr/day:** ~4–6 weeks

**Done when:** idle loops without a visible seam, walk cycle loops convincingly, and no joint or the backpack clips badly through the cycle.

---

## Stage 6 — Spring scene

**Goal:** the first complete environment with the animated Wanderer placed in it.

**Depends on:** Stages 1–5 — the scene showcases the finished, animated character. **First of the four seasons** because the Spring prototype is already underway, so it surfaces scene/lighting/render problems once, before the other three repeat the pattern.

**Tasks:**
- Assemble environment: dirt path, grass, a tree, distant mountain silhouette — matching the site's mountain-journey theme.
- Use real geometry where it must read across lighting setups.
- Light for warm, contemplative mood (golden, low sun).
- Place the Wanderer on the path; set a hero camera angle.
- Resolve any sky/world setup quirks here, in the prototype, not later.
- Save the scene; render one still as the proof-of-concept image.

**Focused hours:** 12–18 · **At 1 hr/day:** ~3 weeks

**Done when:** Spring renders cleanly with the Wanderer placed and lit, and the lighting/world setup is reusable as a template for the next three seasons.

---

## Stage 7 — Summer scene

**Goal:** Summer variant of the environment.

**Depends on:** Stage 6 — reuse the Spring scene as a template; change season, not pipeline.

**Tasks:** fuller foliage; warmer, higher light; lusher palette. Reuse camera and character setup; adjust vegetation, materials, lighting.

**Focused hours:** 6–10 · **At 1 hr/day:** ~1.5–2 weeks (faster — the template exists)

**Done when:** Summer reads clearly distinct from Spring and renders with the same character/camera setup.

---

## Stage 8 — Fall scene

**Goal:** Fall variant.

**Depends on:** Stage 6 template (and the rhythm learned in Stage 7).

**Tasks:** warm palette shift, falling/scattered leaves, lower sun angle. Reuse the template.

**Focused hours:** 6–10 · **At 1 hr/day:** ~1.5–2 weeks

**Done when:** Fall reads as autumn and renders consistently with the others.

---

## Stage 9 — Winter scene

**Goal:** Winter variant — the summit approach.

**Depends on:** Stage 6 template. Placed last because snow, bare trees, and cold light are the biggest material/lighting departure from the template — best attempted once you've repeated the process three times.

**Tasks:** snow on ground and surfaces, bare trees, cold blue light, the summit-approach framing that closes the journey.

**Focused hours:** 8–12 · **At 1 hr/day:** ~2 weeks

**Done when:** Winter renders cleanly and the four seasons together form a coherent journey set.

---

## Total at a glance

| Stage | Focused hrs | ~Calendar at 1 hr/day |
|-------|-------------|------------------------|
| 1. Character | 12–18 | ~3 wks |
| 2. Clothing | 10–15 | ~2–3 wks |
| 3. Backpack | 6–10 | ~1.5–2 wks |
| 4. Rigging | 15–20 | ~3–4 wks |
| 5. Animation | 20–30 | ~4–6 wks |
| 6. Spring | 12–18 | ~3 wks |
| 7. Summer | 6–10 | ~1.5–2 wks |
| 8. Fall | 6–10 | ~1.5–2 wks |
| 9. Winter | 8–12 | ~2 wks |
| **Total** | **~95–143** | **~5–6 months** |

Treat the calendar as a horizon, not a deadline. The dependency order is the part that protects you from rework.

## Notes for a student pacing this

- **One finished thing per session** beats three half-done things. Pick a task that fits an hour.
- **Version every session** (`-v02`, `-v03`). Cheap insurance.
- **Don't start the rig until the body and gear are genuinely final.** Re-weighting after a geometry change is the most common time sink.
- **Animation is the hardest stage** — budget patience there, and lean on the idle clip to learn the tools before the walk cycle.
- **A render is a valid milestone.** After Stage 6 you have an image you can put on the live site immediately, with no framework change — an early, motivating payoff well before any of the React Three Fiber work in `FUTURE_VISION.md`.
- **Stages 7–9 get faster**, not slower — the Spring scene is the template the rest reuse.
