# Wanderer — Fog Journey Production Blueprint

> **Status:** Design blueprint only. Nothing to build yet.
> **Narrative:** One continuous mountain trail. The Wanderer walks without stopping. Fog banks veil the boundaries between four life stages — Spring (Beginning), Summer (Growth), Autumn (Experience), Winter (Wisdom). Inside each fog bank the world changes _and_ the Wanderer ages slightly and gains signs of travel. He stays the same person; the backpack stays the same object throughout.
> **Builds on:** `WANDERER_PRODUCTION_ROADMAP.md`, `FUTURE_VISION.md` (Seasonal journey + Backpack portal concepts), `architecture.md` (R3F target).

---

## Core design principle: fog is the cut

Film hides edits with cuts; this journey hides them with fog. Every change that would break the illusion of one continuous person on one continuous walk — the environment swap, the wardrobe/age change, the asset load/unload — happens **at peak fog density, fully occluded.** The viewer never sees a pop. Fog is not decoration here; it is the transition machine.

Consequence for every system below: the trail, the character, and the camera must be _continuous_; only what's hidden by fog is allowed to discretely change.

---

## 1. Scene Hierarchy

Conceptual scene graph (shared between the Blender source and the eventual Three.js scene; names are indicative):

```
JourneyRoot
├── TrailSystem
│   ├── Trail_Spine            (one continuous path — spline or tiled, never visibly breaks)
│   ├── Trail_Surface          (dirt/rock material that blends season to season)
│   └── Trail_LOD_proxies      (low-detail far segments)
│
├── Environments               (one child per stage; only neighbors active at once)
│   ├── Env_Spring             (terrain dressing, foliage, rocks, ground material, light rig)
│   ├── Env_Summer
│   ├── Env_Autumn
│   └── Env_Winter
│
├── FogSystem
│   ├── Fog_Global             (scene fog driver — density animated by progress)
│   └── FogBank_1..3           (boundary volumes at Spring→Summer, Summer→Autumn, Autumn→Winter)
│
├── Wanderer                   (the persistent protagonist — NEVER fully destroyed)
│   ├── Armature               (one rig, shared by all variants)
│   ├── Body_Variant_active    (swapped/morphed at fog peaks: age + posture)
│   ├── Wardrobe_active        (jacket/layers per stage; wear accumulates)
│   ├── Backpack               (PERSISTENT — same object all four stages)
│   │   ├── Pack_Body
│   │   └── Pack_Flap          (separate, for the portal mechanic)
│   └── Props_active           (optional per-stage: walking stick, scarf — appear in fog)
│
├── CameraRig
│   ├── Camera_Follow          (fixed offset behind/beside the Wanderer)
│   └── Camera_Target          (look-at, slightly ahead up the trail)
│
└── Atmosphere
    ├── Sky_active             (gradient/HDRI per stage, crossfaded in fog)
    ├── KeyLight               (sun; angle + color shift per stage)
    └── Audio                  (wind/footsteps/ambience — optional, opt-in)
```

**Key structural rules**

- `Wanderer` and `Backpack` are single persistent nodes. Seasons swap _around_ them; they are never unloaded.
- `Environments` are independent, individually toggleable. At any moment only the current stage (and the one being faded toward, during fog) is visible.
- The `Trail_Spine` is one object that reads continuous across all four environments — it is the literal thread of the journey.

---

## 2. Asset Requirements

### Trail (one, continuous)

- A single continuous trail that visually carries through all seasons. Two viable builds:
  - **Spline-based** (recommended for scroll): one curve; surface follows it; foliage scattered along it per segment.
  - **Modular tiles**: kit of straight/curve pieces snapped into one path. Easier to dress per season, must hide seams.
- Surface material designed to blend (dirt → leaf-strewn → frosted → snow-edged) without a hard boundary.

### Four environment dressings (not four worlds)

Each is a _set dressing layer_ over the same trail, not a separate scene:

- **Spring:** fresh green grass, budding/young trees, wildflowers, soft wet ground, light mist.
- **Summer:** full lush foliage, tall grass, dense canopy, dry path, warm haze.
- **Autumn:** orange/amber foliage, falling + scattered leaves, thinning canopy, lower light.
- **Winter:** snow cover, bare trees, ice on rocks, sparse, the summit visibly nearer.
- Shared distant **mountain silhouette** that grows nearer/larger across the journey (reinforces ascent).

### Fog

- Designed as a **runtime effect, not baked** — it must be scroll-driven. (In Blender, mock it volumetrically for renders only.)
- 3 transition banks (4 stages = 3 seams), optional 4th approaching the summit.

### Atmosphere per stage

- Sky gradient/HDRI ×4, key-light color+angle ×4 (dawn-warm → high-summer → golden-autumn → cold-winter), matching the locked dawn→alpine→summit palette logic.

### Character (see §3)

- One rig, one backpack, four body/wardrobe variants.

### Performance budgets (from `blender-export-pipeline.md`)

- Hero-class GLBs ≤ ~5 MB each; Draco-compress all; LOD far geometry; instance foliage.

---

## 3. Character Variation Requirements

**The hard constraint: he must remain recognizably the same man.** Identity is carried by three things that NEVER change — the **rig**, the **proportions**, and the **backpack**. Everything else ages subtly.

### What stays constant

- Skeleton (same armature, same bone names, same walk cycle).
- Core proportions and face structure.
- The **backpack** — same model, same materials, same position, every stage. (It's the one object the viewer can anchor to and say "same traveler.")

### What changes, stage to stage (subtle, cumulative)

| Stage  | Age cue                    | Travel/wear cue                                         | Posture                      |
| ------ | -------------------------- | ------------------------------------------------------- | ---------------------------- |
| Spring | youthful, clean            | crisp gear, light pack                                  | upright, eager               |
| Summer | unchanged face, slight tan | sleeves rolled, dust on boots                           | confident, relaxed           |
| Autumn | fuller beard, first grey   | worn jacket, scuffed pack straps, maybe a walking stick | steadier, weathered          |
| Winter | greyer, lined              | heavy coat, frosted gear, most worn                     | slightly stooped, deliberate |

### Recommended implementation (keeps identity + backpack locked)

- **One rig.** Never duplicated.
- **Body:** a single base mesh driven by **shape keys** for age/posture (subtle), rather than four separate sculpts — guarantees "same person."
- **Wardrobe + wear:** **material/texture variants** (swap albedo/roughness maps for accumulating dirt, fading, frost) plus a small number of **swappable clothing meshes** (light jacket → heavy coat).
- **Props:** optional add-on objects (walking stick, scarf) parented to the rig, toggled on at the appropriate fog transition.
- **Backpack:** referenced once, parented once; only its _texture_ may gain wear — never its geometry or position.

This means the "variant" swapped at each fog peak is really: `{shape-key weights, material set, wardrobe toggle, prop toggle}` — a lightweight state change, not a whole new character. Far cheaper than four full characters and structurally impossible to look like a different person.

---

## 4. Camera Strategy

**Continuity rule:** the camera never cuts. It moves on one smooth path so the walk feels unbroken.

- **Primary rig:** `Camera_Follow` holds a fixed offset behind-and-slightly-beside the Wanderer (the locked hero framing — we see his back and pack as he faces the trail/summit). `Camera_Target` looks slightly _ahead_ up the trail, so the destination is always implied.
- **Forward motion model (critical):** the Wanderer **walks in place (treadmill)**; the world and trail scroll _past_ him, OR the whole follow-rig dollies forward along the spline. Either way, **scroll position drives forward progress**, not a baked translation. (See §7 and the workflow note in §6 — the existing walk has _translating_ root motion that must be converted to in-place.)
- **Per-stage mood, not per-stage cut:** allow gentle, continuous drift — camera height rises slightly approaching Winter/summit, focal length tightens a touch for gravity — but never a hard reframe.
- **Through fog:** camera behavior is unchanged; only fog density rises. The swap is invisible because nothing about the camera signals an edit.
- **Portal moment (future):** at designated rest points the follow-cam can ease to a 3/4 over-the-shoulder so the backpack faces the viewer for the portal interaction (see §7).

---

## 5. Transition Strategy (the heart of it)

Each seam is one fog bank crossed in three beats, all driven by normalized journey progress `p ∈ [0,1]`:

```
   approach            peak (occluded)             emerge
 ──────────────►   ████████████████████   ──────────────►
 fog 0 → 1          fog = 1 (full white)     fog 1 → 0
 old season vis     SWAP HAPPENS HERE        new season vis
 old Wanderer       • env: Spring→Summer     new Wanderer
 state              • char: age/wear state    state
                    • load next / unload prev
```

1. **Approach:** as `p` nears a seam threshold (e.g. 0.25, 0.50, 0.75), fog density ramps 0→1. Outgoing season still rendered.
2. **Peak (fully occluded):** at density = 1 the view is opaque. _Now_ and only now: toggle environment segment (old off / new on), apply the next character state (shape-key + material + wardrobe + prop), load the upcoming segment, dispose the one two-behind. A short **crossfade** of both seasons during the peak is the safety net if density can't reach fully opaque on weak GPUs.
3. **Emerge:** fog density ramps 1→0, revealing the new season and the subtly-aged Wanderer, still mid-stride. Continuity preserved.

**Why this satisfies the requirements**

- One trail (§1) + treadmill/dolly (§4) = continuous walk.
- Fog is the mechanism (req 2,3) and the mask for character change (req 4).
- Backpack never participates in the swap (req 5).
- Swaps are state changes around persistent Wanderer/Backpack nodes, so the portal mechanic stays wired regardless of season (req 6).
- Everything keys off scroll-progress `p` (req 7).

---

## 6. Recommended Blender Workflow

Sequenced to reuse the existing Spring prototype and the finished character.

1. **Lock the persistent core.** Finalize one Wanderer rig + one backpack (flap separate, per the portal concept). This is the identity anchor; freeze it.
2. **Author character states, not characters.** Add age/posture **shape keys** to the base body; build the **material variant sets** (clean → worn → frosted) and the one or two swappable wardrobe pieces + optional props. Verify all four states share the rig and read as the same person.
3. **Convert the walk to in-place.** The current walk cycle has _translating_ root motion. For scroll-driven web it must loop **in place** (root stays put; feet cycle). Re-bake/strip root translation into a clean looping `walk_inplace` action. (Flagged because it's the one piece of existing animation that blocks the scroll model.)
4. **Build the trail once.** One spline (or modular kit) that all four dressings share. Make the surface material season-blendable.
5. **Derive four environment dressings** from the Spring prototype as a template (exactly the roadmap's Stages 6→9 logic — change season, not pipeline). Keep each as its own collection for clean export.
6. **Mock fog for stills only.** Use volumetrics to art-direct each seam as a render; do **not** rely on baked fog for the web — fog is a runtime effect there.
7. **Export discipline (per `blender-export-pipeline.md`):** +Y up, Principled BSDF, transforms applied, baked textures, Draco. Export: one `wanderer.glb` (rig + in-place walk + variant meshes/shape keys), four `env_<season>.glb`, one `trail.glb`, shared `backpack` either inside the Wanderer file or as its own node. Keep each ≤ ~5 MB.
8. **Version every session** (`-v02`, `-v03`), one finished thing per sitting — same discipline as the production roadmap.

---

## 7. Recommended Three.js Workflow

Target stack per `architecture.md`: **Next.js 15 + TypeScript + React Three Fiber + drei + Tailwind**, Vercel.

1. **One canvas, scroll → progress.** Map scroll position to `p ∈ [0,1]` for the whole journey (drei `ScrollControls`, or Lenis + a normalized scroll value). `p` is the single source of truth.
2. **Persistent core mounted once.** Load `wanderer.glb` (looping `walk_inplace`) and the backpack as long-lived nodes. They are never unmounted across seasons — this is what keeps the portal mechanic and identity intact.
3. **Forward motion.** Either dolly the follow-camera along the trail spline by `p`, or scroll the world toward a fixed camera. Walk plays in place; `p` supplies the travel.
4. **Segment manager.** Keep at most two environment GLBs resident (current + next). At fog-peak thresholds, toggle visibility, swap the Wanderer state object (`{shapeKeys, materialSet, wardrobe, props}`), and load/dispose segments. Dispose geometry/material/textures to control memory.
5. **Fog driver.** `scene.fog` (FogExp2) density as a function of `p`, peaking at each seam threshold; optionally reinforce with a soft fog-plane sprite for art control. The density curve _is_ the transition timeline.
6. **Crossfade safety net.** During each peak, briefly render both seasons and crossfade material opacity, so weak GPUs that can't reach fully-opaque fog still hide the swap.
7. **Backpack portal hook (future-compatible now).** Register the backpack as a raycast hotspot from day one. Click/tap → play `Pack_Flap` open → spawn portal planes (project/section destinations). Because the backpack is a persistent node independent of season state, this interaction is authored once and works in every stage. (Matches `FUTURE_VISION.md` "clickable hotspots".)
8. **Static fallback (non-negotiable per guiding principle).** Pre-render one image per season; if WebGL is unavailable, serve the four stills as a scroll sequence. The site must never _require_ WebGL to tell the story.
9. **Performance:** Draco decode, frustum-cull off-segment, instance foliage, lazy-load segments ahead of `p`, respect `prefers-reduced-motion` (reduce/disable parallax + auto-walk).

---

## Open questions to resolve before build

- **Number of seams:** 3 (Spring→Summer→Autumn→Winter) or a 4th fog into a final summit "Wisdom" beat?
- **Aging intensity:** how visible should the age progression be — barely-there (subtle grey) or clearly readable as decades? Affects shape-key budget.
- **Trail build:** spline vs modular tiles (spline favors scroll continuity; tiles favor per-season dressing).
- **Portal placement:** does the backpack portal open _during_ the walk at rest points, or only at journey's end?

---

## Requirement coverage check

1. One continuous trail → §1 TrailSystem, §6.4. ✅
2. Fog as transition mechanism → §5. ✅
3. Environment changes inside fog → §5 peak beat. ✅
4. Character changes hidden by fog → §5 + §3 state-swap. ✅
5. Backpack consistent throughout → §3 persistent core, §1 rules. ✅
6. Portal mechanic stays compatible → §1 persistent Backpack node, §7.7. ✅
7. Designed for Three.js scroll-driven → §4 motion model, §7. ✅

_Blueprint only. No assets created. Build sequence remains the dependency chain in `WANDERER_PRODUCTION_ROADMAP.md`, now extended with the fog-transition layer above._
