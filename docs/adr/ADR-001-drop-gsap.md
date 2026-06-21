# ADR-001: Drop GSAP; drive Phase 3 from the existing scroll store

**Status:** Proposed (analysis only — no code changed)
**Date:** 2026-06-20
**Author:** Senior Systems Analyst review
**Affected files:** `package.json`, `src/scroll/useScrollSetup.js`, `src/three/CameraRig.jsx`, `src/store/useExperience.js`, `src/data/stages.js`, `src/data/camera.js`

## Context

Phase 3 was originally scoped (README) as _"GSAP ScrollTrigger master timeline (camera keys, reveals)."_ `gsap` was added as a dependency in anticipation. Reviewing the five core files shows the architecture **evolved past that plan before it was implemented**:

1. **Scroll authority already exists.** `useScrollSetup.js` runs Lenis and writes a single normalized `scrollProgress` (0→1) into the Zustand store. This _is_ the master scroll signal GSAP's ScrollTrigger would otherwise provide.
2. **The camera timeline is already implemented without GSAP.** `CameraRig.jsx` reads `scrollProgress` via `getState()` inside `useFrame`, samples the `SHOTS` keyframes (`camera.js`) with `smoothstep` interpolation, and applies frame-rate-independent exponential smoothing (`k = 1 - Math.exp(-FOLLOW * dt)`). This is a complete, working keyframe timeline — the exact thing a GSAP timeline would do, but GPU-frame-driven and re-render-free.
3. **The character scrub is GSAP-free** as well (`Wanderer.jsx` scrubs `action.time` from `scrollProgress`).
4. **GSAP is verifiably unused.** `gsap`/`ScrollTrigger` occur only in a stale comment. Zero imports.
5. **The reveal mechanism is already half-built in the store but unconsumed.** `stageId` is derived on every scroll write (`useExperience.js:24`) but **no component reads it**. `stages.js` also exports `localProgress` (per-stage 0→1) which is **never called**. These are precisely the primitives DOM reveals need — already present, just unwired.

The only Phase-3 capability genuinely _missing_ is **DOM reveals** for the overlay beats (Hero → Philosophy → Focus → Work → Contact), which currently just stack with no entrance behavior.

## Decision

**GSAP is not required. Remove it.** Implement Phase 3 reveals on top of the existing single-source-of-truth scroll store rather than introducing a second scroll/animation system.

Specifically:

- **Keep** the current architecture for all 3D motion (camera + character): Lenis → store `scrollProgress` → `getState()` sampling in `useFrame`. No change.
- **Add reveals by consuming what the store already produces.** Two store outputs are already computed and free to read:
  - `stageId` — a **discrete** value that changes ~6 times total. Subscribe to it with a selector (cheap — not per-frame), and toggle a `data-stage`/class on the overlay so **CSS transitions** handle the reveals. This ties DOM beats to the _same authored timeline_ as the camera, with zero new dependencies and zero per-frame React work.
  - `localProgress(p, stage)` — available if any reveal needs continuous (not just on/off) progress within a stage.
- **Drop `gsap`** from `package.json`.
- **Update the stale comments** in `useScrollSetup.js:6` and the `CameraRig.jsx:7` "Phase 3" header to reflect the no-GSAP reality.

### Why not GSAP/ScrollTrigger

- It would **duplicate the scroll authority** Lenis already owns, requiring an explicit Lenis↔ScrollTrigger bridge (`lenis.on('scroll', ScrollTrigger.update)`) — added coupling for no gain.
- ScrollTrigger fires **main-thread callbacks**; the current `useFrame` sampling is GPU-synced and **re-render-free**, which the CLAUDE.md performance idiom mandates.
- It violates **"ask before adding dependencies / no dead deps"** to keep a library the architecture doesn't use.

## Dead dependencies / dead code identified

| Item                      | Location                                 | Status                                  | Recommendation                                                                                                                 |
| ------------------------- | ---------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **`gsap`**                | `package.json` deps                      | **Dead** — zero imports                 | **Remove**                                                                                                                     |
| **Phase-3 GSAP comments** | `useScrollSetup.js:6`, `CameraRig.jsx:7` | Misleading (describe unbuilt GSAP plan) | Rewrite to current reality                                                                                                     |
| **`localProgress`**       | `stages.js:22`                           | Unused export                           | **Keep** — it's the intended Phase-3 reveal helper; wire it when reveals land (or remove if reveals stay discrete/stage-based) |
| **`stageId`**             | `useExperience.js`                       | Written, never read                     | **Keep** — it's the enabler for stage-driven reveals; this ADR puts it to use                                                  |

_Note: `localProgress`/`stageId` are dead **today** but are exactly the Phase-3 primitives. Removing them would be churn; the ADR converts them from latent to used. `gsap` is the only true removal._

## Recommended simplest architecture

```
Lenis (smooth scroll)
  └─ useScrollSetup → store.setScrollProgress(p)
       store derives:  scrollProgress (continuous)  +  stageId (discrete)
            │                      │
            │ getState() in        │ selector subscribe
            │ useFrame (per-frame)  │ (~6 changes total)
            ▼                      ▼
   CameraRig + Wanderer     useStage() → data-stage on overlay
   (3D, unchanged)          → CSS transitions reveal each beat
```

One scroll signal, one store, two consumers (frame-driven 3D; stage-driven CSS). No second timeline library, no IntersectionObserver, no ScrollTrigger.

## Consequences

**Positive**

- Removes a dependency and ~its bundle weight; eliminates a dead dep flagged by your own guardrails.
- Phase 3 becomes small and consistent: reveals share the camera's timeline, so DOM beats and camera moves stay in lockstep by construction.
- No per-frame React re-renders (reveals key off discrete `stageId`, not continuous `scrollProgress`).
- `prefers-reduced-motion` is trivial — reveals are CSS, gated by the existing media query / store flag.

**Negative / trade-offs**

- Hand-rolled interpolation means no access to GSAP's rich easing/sequencing library. Current `smoothstep` + exp-smoothing is adequate for the camera; if a future beat needs complex multi-property choreography with elaborate eases, revisit (see ADR-supersede path below).
- Stage-driven reveals are tied to **6 discrete stages**. If you later want many independent fine-grained reveals per stage, you'd lean on `localProgress` or per-element thresholds — slightly more bespoke than dropping in ScrollTrigger.

## Alternatives considered

1. **Keep GSAP, build ScrollTrigger timeline (original plan).** Rejected: duplicates Lenis, adds main-thread coupling, contradicts the already-working `useFrame` sampling, retains a dep the 3D layer won't use.
2. **IntersectionObserver for reveals.** Viable and zero-dependency (the `website/` fallback already uses it). Rejected as _primary_ because IO ties reveals to viewport entry, **decoupled** from the authored scroll timeline — fine for generic fade-ins, weaker for a cinematic where DOM beats should sync to camera moves. **Recommended as the pragmatic fallback** if stage-driven CSS proves fiddly.
3. **Store-driven CSS via `stageId` (chosen).** Best fit: reuses existing store output, keeps single source of truth, no new deps, syncs with the camera.

## Revised Phase 3 (proposed scope)

> **Phase 3 — Authored reveals & timeline polish (no GSAP)**
>
> - Remove `gsap`; correct the stale Phase-3 comments.
> - Add a small `useStage()` consumer that reflects `stageId` onto the overlay (`data-stage`) and reveals each beat via CSS transitions (respecting `prefers-reduced-motion`).
> - Use `localProgress` only where a beat needs continuous in-stage progress.
> - Tune the existing `SHOTS`/easing for the camera; no new animation system.

**Supersede condition:** if a future phase genuinely requires complex, multi-property, library-grade easing/sequencing that hand-rolled interpolation can't serve cleanly, open ADR-002 to reintroduce GSAP **scoped to that need** — not as the scroll authority.
