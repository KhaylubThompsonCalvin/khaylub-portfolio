# Wanderer — Next 7 Days

> A one-week, one-hour-a-day plan that advances `WANDERER_PRODUCTION_ROADMAP.md` from where the project **actually is**, not where the roadmap assumes it starts.
> Optimized for: 1 hr/day, a PCC student schedule, and shipping visible progress over perfection.
> Scope: Blender only. No website changes, no architecture, no framework.

## Reality check (what's actually on disk)

The Blender workspace at `Desktop/Blender/Wanderer/` is **fully scaffolded but empty**:

| Folder           | Contents                  |
| ---------------- | ------------------------- |
| `blend-files/`   | empty — no `.blend` files |
| `renders/`       | empty                     |
| `references/`    | empty                     |
| `textures/`      | empty                     |
| `exports/`       | empty                     |
| `documentation/` | empty                     |

The project `assets/` folder is also empty. So against the roadmap, **Stage 1 (Character) has not started** — there is no body mesh to "finish," and no reference gathered yet.

> Note: if you have working `.blend` files somewhere outside the accessible folders (`Desktop/Blender`, `Desktop/Projects`), point me at them and I'll redo this against the real geometry. Everything below assumes the accessible workspace is the true starting point: near-zero.

This is fine. A blank start has one advantage — there is zero ambiguity about what to do first.

## 1. Highest-leverage task this week

**Block out the Wanderer base body — proportions and silhouette only.**

Everything in the roadmap (clothing, backpack, rig, animation, all four seasons) deforms, dresses, or poses this one mesh. Until a base body exists, every other stage is blocked. A rough but correctly-proportioned blockout is the single thing that unlocks the most downstream work for the least effort. You are not finishing the character this week — you are getting it to exist.

## 2. What can be completed this week (7 × 1 hr)

A realistic, shippable week. Each day ends at a save point.

- **Day 1 — Reference + setup (1 hr).** Collect 3–5 reference images (front + side body proportions, silhouette inspiration). Drop them in `references/`. Open a fresh file, add reference planes, set scene scale to 1.0. Save `wanderer-blockout-v01.blend` in `blend-files/`.
- **Day 2 — Torso + hips (1 hr).** Block the core mass with a primitive (cube/cylinder). Proportions only. Save `-v02`.
- **Day 3 — Head + neck + limbs as primitives (1 hr).** Add simple shapes for head, arms, legs. Don't detail — get the stick-figure-in-clay right. Save `-v03`.
- **Day 4 — Proportion pass (1 hr).** Check silhouette from front, side, and 3/4. Adjust limb length, head size, stance. This is where the roadmap's "stylized proportions" live. Save `-v04`.
- **Day 5 — Join + rough shape (1 hr).** Combine into a single readable body mass; smooth the worst seams. Still blockout-grade. Save `-v05`.
- **Day 6 — Silhouette lock (1 hr).** Final proportion judgment. Once it reads as "the Wanderer" in silhouette, stop adjusting shape. Save `-v06`.
- **Day 7 — Tidy + note (1 hr).** Apply transforms (scale 1.0, rotation 0). Shade smooth. Write a 5-line note in `documentation/` (proportions chosen, what's next). Save `wanderer-blockout-final.blend`.

**End-of-week deliverable:** a saved, proportion-locked base body blockout + reference gathered + a short note. That is genuine, visible Stage 1 progress and a real milestone.

## 3. What should NOT be worked on yet

Resist these — all are blocked or premature, and touching them now creates rework:

- **Topology cleanup / retopo / detail sculpting.** This week is blockout only. Clean edge flow comes _after_ proportions are locked — doing it now means redoing it when proportions shift.
- **Clothing, backpack** (Stages 2–3) — need a finished body first.
- **Rigging** (Stage 4) — rigging an unfinished mesh guarantees re-weighting.
- **Animation** (Stage 5) — nothing to animate.
- **Any season scene — Spring included** (Stages 6–9) — the scene showcases a finished, animated character that doesn't exist yet.
- **Materials / textures beyond a flat placeholder** — premature on a blockout.
- **GLB export, React Three Fiber, the backpack portal, seasonal scroll** — many stages away; ignore entirely this week.

## 4. Dependencies blocking future stages

```
Stage 1 Character ── BLOCKS ──► everything else
   └─ currently blocked by: no reference locked, no base body mesh
                            (this week clears both → blockout)

Stage 1 still not "done" after this week:
   blockout ≠ finished. Topology cleanup + watertight + final materials
   remain before Stage 2 can safely start.

Downstream (not this week):
   Clothing (2) ─┐
   Backpack (3) ─┴─► needs finished body  ──► Rigging (4) ──► Animation (5)
   Backpack (3) also gates the Backpack Portal concept
   Spring (6) needs 1–5 done; Summer/Fall/Winter (7–9) reuse Spring as template
```

The critical-path truth: **Stage 1 is the only thing standing between you and the entire rest of the roadmap.** This week starts it. It will take more than one week to _finish_ (the roadmap budgets ~3 weeks for Stage 1) — the blockout is the first third of it.

## Pacing notes for the week

- **One save per session, versioned** (`-v01`, `-v02`...). Never close mid-operation.
- **Blockout means ugly is OK.** Proportion and silhouette are the only success criteria this week. Detail is a future-you problem.
- **If a day runs short,** just nudge proportions and save — a small finished step beats an unfinished big one.
- **If you finish early** any day, gather more reference rather than starting detail work. More reference de-risks the whole character.
- Next week's plan: continue Stage 1 — topology pass and making the mesh watertight — before any clothing.
