# Source of Truth — Khaylub.com

> Why this exists: project knowledge had drifted across two stores. This file defines
> **which store owns which decisions** so they stop disagreeing. Established 2026-06-19.

## The two stores

| Store | Location | Owns |
|-------|----------|------|
| **Repo** (this folder) | `Desktop\Projects\Khaylub.com\` + GitHub `KhaylubThompsonCalvin/khaylub-portfolio` | Code, build, deploy, and **operational truth**: `CURRENT_STATE.md`, `MVP_LAUNCH_ROADMAP.md`, `WANDERER_PRODUCTION_ROADMAP.md`, the `website/` files |
| **Obsidian vault** | `01 Projects/Khaylub.com/` | **Design & narrative decisions**: voice/copy, the Wanderer story, portals, storyboard, security spec, risk register, the Engineering Constitution |

## Rules

1. **Code and "what exists now" → the repo.** `CURRENT_STATE.md` is authoritative for the
   present state of the site. The live `website/` files are the final word on what's built.
2. **Design, narrative, and decisions → the vault.** When a creative or architectural
   decision is made, it's recorded in the vault first.
3. **Don't duplicate — cross-link.** If both stores need to reference something, one owns
   it and the other links to it. Avoid a third conflicting copy.
4. **The Fog Journey Blueprint exists in both** (`docs/WANDERER_FOG_JOURNEY_BLUEPRINT.md`
   and vault `07 — Wanderer Fog Journey Blueprint`). Treat the **vault** copy as the editable
   master for narrative; the repo copy is a snapshot — sync, don't fork.

## Vault decision notes that govern this repo

- `concepts/Storyboard — Wanderer Fog Journey (Previs)` — the Blender shot list
- `concepts/Portal Menu Concept` — the five locked portals
- `concepts/Feature — Hardened Site & Security Write-up` — Phase 2 security track
- `concepts/Narrative Source — Lock-In Culture` — the voice/quote source
- `02 Areas/Dev Environment/Engineering Constitution` — coding standards for all projects
- `docs/06 — Risk Management` — the risk register

## Cleanup log (2026-06-19)

- ✅ Archived the Next.js-era docs to `docs/archive/` (`architecture.md`, `build-plan.md`,
  `blender-export-pipeline.md`, plus the earlier `phase-1-requirements.md`) — see
  `docs/archive/README.md`.
- ✅ Reconciled `MVP_LAUNCH_ROADMAP.md` against `CURRENT_STATE.md` (favicon, SEO/OG, and the
  four real cards already done; no loader or social links in the current build).
- ✅ Rewrote `README.md` and `CURRENT_STATE.md` to reality; corrected the SQLite learning tracker.
- ⏳ **Not yet pushed to GitHub** — these are local edits awaiting a commit/push.
