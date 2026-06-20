# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Engineering guardrails (required)

These are non-negotiable for any change in this repo. They override convenience and speed.

- **No AI slop.** Write code and copy that reads like a human wrote it deliberately — no filler comments, no boilerplate restating the obvious, no hedging prose, no generated-looking variable soup. Match the existing voice and density.
- **Prioritize security, accessibility, maintainability, and performance** — in that order when they conflict. A change that trades any of these for a quicker implementation needs an explicit reason.
- **No placeholder `href="#"` links.** Every link points to a real destination. If a destination doesn't exist yet, render the item as a non-link element (e.g. `<span>` / disabled control) with an honest "coming soon" state — never a dead anchor that jumps to the top of the page.
- **No fake functionality.** Don't ship buttons, forms, or features that look interactive but do nothing. If it isn't wired, don't render it as if it is. Honest status badges (as in `data/projects.js`) are the model.
- **No secrets in code.** No API keys, tokens, or credentials in source, config, or commits. Use environment variables and document the required names. (Full handling — `.env`, `.env.example`, MCP keys — under _AI Tooling Guardrails → MCP / API key handling_.)
- **Explain architectural decisions.** When you introduce a pattern, restructure, or pick one approach over an alternative, say why — in the PR description and, where it aids future readers, an inline comment. The existing `data/` choreography and the `getState()`-in-`useFrame` idiom are documented this way; keep that standard.
- **Ask before adding dependencies.** Do not add an npm package without approval. Prefer the platform and what's already installed (React, R3F, drei, three, gsap, lenis, zustand). When proposing one, state what it costs in bundle size and what it replaces.
- **Keep React components focused.** One job per component. Lift shared state to the store, push choreography/config into `data/`, and split a component before it grows multiple responsibilities (the `ui/` and `three/` split is the pattern).
- **Use semantic HTML.** Real `<nav>`, `<main>`, `<section>`, `<button>`, headings in order. Don't make a `<div>` do a button's job (the current `LoadGate` `div[role=button]` is a known violation to fix, not to copy).
- **Maintain WCAG AA accessibility.** 4.5:1 contrast for text, visible focus states on every interactive element, keyboard operability with no traps, labels on inputs, and `prefers-reduced-motion` honored. AA is the floor, not the goal.
- **CodeRabbit findings are blockers.** Every review issue is resolved before merge; ignoring one needs Kt's explicit approval, recorded in the thread. (See _AI Tooling Guardrails → CodeRabbit_ for the full workflow.)

## AI Tooling Guardrails

This repo uses AI tools that **generate** code (21st.dev Magic) and **review** code (CodeRabbit). Both advise; neither decides. The rules below govern how their output enters the codebase. They extend — never relax — the Engineering guardrails above.

### Human accountability (the meta-rule)

Tools assist; a human owns the result. Whoever opens the PR is accountable for every line in it, regardless of whether it was generated, suggested, or auto-reviewed. "The AI wrote it" / "CodeRabbit approved it" is never a justification for a merged defect. If you don't understand a line well enough to defend it in review, it doesn't ship.

### Architecture preservation

AI-generated code must conform to the existing project architecture — it does not reshape it. The patterns documented in this file (the `scrollProgress` single source of truth, `getState()`-in-`useFrame`, choreography-as-data in `data/`, the `ui/`–`three/` split, plain CSS + tokens) are the target to fit into, not suggestions to improve on.

- **Do not replace major systems without explicit approval from Kt** — frameworks, state management (Zustand), the scrolling system (Lenis), the styling system (plain CSS + custom properties), or the rendering pipeline (React Three Fiber / Three.js). This extends _Future Architecture Direction_ to AI output.
- **Prefer extension over replacement.** Add to and compose with what exists before refactoring it away. A generated component that assumes a different state, styling, or animation model gets adapted to ours — not merged with its own.
- **Surface the conflict; don't resolve it unilaterally.** If a task seems to _require_ an architectural change to do well, stop and raise it with the reasoning (per "Explain architectural decisions") rather than quietly restructuring inside a feature PR.

### 21st.dev (generated components)

- **Reference implementations, not drop-ins.** Treat every generated component as a starting point to adapt, not paste. Rebuild it in this repo's idioms before it lands.
- **Adapt to the existing design system.** Port generated markup and styles to the plain-CSS convention in `src/index.css`; strip the generator's utility classes and inline styles.
- **Design-token enforcement.** Colors, fonts, spacing, and radii come from the CSS custom properties (`--bg`, `--ink`, `--muted`, `--accent`, `--font-display/body`) — never hardcoded hex/px lifted from generated output. If a needed token doesn't exist, add it to `:root` deliberately; don't inline a one-off value.
- **No Tailwind, no second styling system** without explicit approval from Kt. One styling system in this repo: plain CSS + custom properties.
- **Generated imports trigger the dependency rule.** Components often assume `framer-motion`, `lucide`, `clsx`, Radix, etc. Audit every import; strip what isn't needed and get approval (per "Ask before adding dependencies") for anything that stays. No transitive dependency arrives silently inside a pasted component.
- **Inherits the repo's contracts.** Generated UI honors the same rules as hand-written UI: semantic HTML, WCAG AA, visible focus, 44px touch targets, `prefers-reduced-motion`, and the `getState()`-in-`useFrame` performance idiom (never subscribe a component to `scrollProgress`). No competing animation system alongside Lenis/GSAP.
- **Usage posture — Mode A / Mode B, never Mode C.** For the Wanderer 3D experience and its signature overlay, 21st.dev is **inspiration/reference only** (Mode A): it cannot generate React Three Fiber and must not reshape the bespoke layer. For new, self-contained **utility widgets**, **Mode B** is allowed — generate as a reference, then adapt to our system per the rules above. **Never paste a generated component directly into the tree** (Mode C is prohibited), and **no Tailwind or new dependencies without Kt's approval**. The server is configured in `.mcp.json` via `${MAGIC_API_KEY}`; the key value lives in your OS/user environment, never the repo.

### Line-by-line review of generated code

No generated code merges as-emitted. Before commit, read every line, confirm you understand what it does, verify provenance/license for any vendored community component, and delete anything speculative or unused. Generated code gets _more_ scrutiny than hand-written code, not less — it looks finished before it is.

### CodeRabbit (AI review)

- **Findings are blockers.** Every CodeRabbit issue is resolved before merge. Dismissing, suppressing, or ignoring one requires Kt's explicit approval, recorded in the PR thread with the reason.
- **Runs after the setup checklist, not instead of it.** Self-review your diff and complete the security + accessibility passes first. CodeRabbit is a second set of eyes, not the first.
- **Scope it.** A committed `.coderabbit.yaml` excludes dead and fallback paths (`_archive/`, `website/`, `dist/`, `node_modules/`) so reviews surface real findings. Treat that config as reviewable code.
- **Advisory, not authoritative.** CodeRabbit can be wrong or noisy. A finding may be declined on technical merit — but only with a stated reason and approval, never silently.

### No AI auto-merge

No AI tool merges to `main`. `main` is branch-protected; merges require passing CI, resolved (or explicitly approved) CodeRabbit findings, and a **human** clicking merge. Do not enable auto-merge, and do not let any bot or agent self-approve its own PR.

### MCP / API key handling

- Keys for 21st.dev, CodeRabbit, and any MCP server live in **local MCP configuration**, outside the repository — never in source, committed config, or tracked files.
- `.env` files are never committed; `.env.example` documents the required variable **names only** (no values).
- CI credentials live in GitHub Actions **repository secrets**, not in workflow files.
- Before installing any tool that issues a key, confirm `.gitignore` covers `.env`, `dist/`, and `node_modules/`.

## Setup checklist (run before requesting a CodeRabbit review)

Work through this before pushing a branch for review. CodeRabbit is the gate _after_ this, not a substitute for it.

1. **Git status.** `git status` is clean of stray files; only intended changes are staged. Confirm you're not on `main` (see branch workflow). Review your own `git diff` first — read every hunk.
2. **Lint / format.** There is no configured linter or formatter yet (only `dev`/`build`/`preview` exist). _Recommendation:_ add ESLint (`eslint-plugin-react`, `eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y`) + Prettier and a `lint` script before the codebase grows — propose this rather than silently adding it (see dependency rule). Until then, manually verify formatting matches surrounding files and `npm run build` passes with no warnings.
3. **Security review.** No secrets, keys, or tokens in the diff. External links use `rel="noreferrer"` (and `noopener`) with `target="_blank"`. No `dangerouslySetInnerHTML` with unsanitized input. New dependencies vetted and approved. No `console.log` or debug globals shipping to production (gate behind `import.meta.env.DEV`, as `window.__seek` is).
4. **Accessibility review.** Keyboard-only pass: every interactive element reachable, operable, and visibly focused, with no traps (especially the entry gate). Text contrast ≥ 4.5:1 against its _actual_ backdrop — including text floating over the 3D canvas. Interactive elements are semantic and ≥ 44×44px touch targets on mobile. Images have alt text; icon-only controls have `aria-label`. `prefers-reduced-motion` still degrades gracefully.
5. **Branch workflow.** Never commit directly to `main`. Branch per unit of work (`feat/…`, `fix/…`, `chore/…`), keep commits scoped with clear messages, open a PR, and let CodeRabbit review it. Address findings (rule above) before merge.

## Commands

```bash
npm install
npm run dev      # Vite dev server, http://localhost:5173 (opens automatically, host exposed)
npm run build    # -> dist/  (assetsInlineLimit: 0 — GLBs/videos always emitted as files)
npm run preview  # serve the production build
```

There is no test runner, linter, formatter, or typecheck step — the only scripts are the three above. This is plain JS + JSX (no TypeScript). When verifying a change, run `npm run dev` and confirm in-browser; there is no `npm test`.

Dev aids:

- On load the Wanderer loader prints the GLB's animation clip names to the console (`[Wanderer] GLB animation clips: [...]`) — this is the self-check that Walk/Idle survived the Blender export.
- `window.__seek(frac)` (DEV only) jumps to an exact scroll fraction, e.g. `window.__seek(0.57)`, for tuning camera shots without scrolling.

## Two codebases in one repo — do not confuse them

| Path                       | What it is                                                                                            | Status               |
| -------------------------- | ----------------------------------------------------------------------------------------------------- | -------------------- |
| root `index.html` + `src/` | **The active app** — the React + R3F "Wanderer" experience. This is what `npm run dev/build` targets. | Live, in development |
| `website/`                 | Standalone static site (plain HTML/CSS/JS, no build). Retained as the **no-WebGL fallback**.          | Frozen reference     |
| `_archive/`                | Old skeletons and cinematic experiments.                                                              | Dead                 |

Note a documentation hazard: `docs/CURRENT_STATE.md` is written about the **`website/` static site**, not the React app — its "what exists today" describes the fallback. For the live app, trust `README.md` and the `src/` code over that doc. Default all work to the React app unless explicitly asked about the fallback.

## Architecture — scroll-driven 3D

One continuous timeline. The Wanderer (a rigged GLB hero) walks _in place_ at the world origin while the camera moves around him; scroll position is the master clock that drives every system.

**The spine — one source of truth.** Everything hangs off a single normalized `scrollProgress` (0→1):

```
Lenis (smooth scroll)
  └─ scroll/useScrollSetup.js  writes ──▶  store/useExperience.js (Zustand)
                                            scrollProgress + derived stageId
                                                  ▲ read by every system
        three/CameraRig.jsx ── three/Wanderer.jsx ── (future: Atmosphere, UI reveals)
```

- `store/useExperience.js` is the single source of truth: lifecycle flags (`started`, `ready`, `reducedMotion`) + `scrollProgress` + `stageId`. Keep it lean — derived values are computed by consumers, not stored.
- The DOM overlay (`<main className="overlay">` in `App.jsx`) is a tall stacked column; its height (`SCROLL_VH` = 700vh, from `data/stages.js`) _is_ the scroll track. The 3D `<Canvas>` is `position: fixed` behind it (`zIndex: 0`); text sections sit on top with `pointer-events` selectively re-enabled on `.inner`.

**Critical performance idiom — never break this.** Systems that animate every frame read scroll via `useExperience.getState().scrollProgress` _inside_ `useFrame` (see `CameraRig.jsx:41`, `Wanderer.jsx:52`). They do **not** subscribe with a selector. Subscribing to `scrollProgress` (e.g. `useExperience(s => s.scrollProgress)`) would re-render that React component ~60fps, because the store writes a new float on every Lenis tick. Use `getState()` in the frame loop; use selector subscriptions only for discrete state that changes rarely (`started`, `ready`, `reducedMotion`, `stageId`).

**Choreography lives in `data/`, not in components.** Edit these files to retune the experience; the `three/` components are generic samplers:

- `data/stages.js` — the six phases and their `scrollProgress` ranges (unequal weighting), plus `stageAt()` / `localProgress()` helpers and `SCROLL_VH`.
- `data/camera.js` — `SHOTS`: one keyframed camera pose (`pos` + `look`, world metres) per stage. `CameraRig` interpolates between them with `smoothstep` + frame-rate-independent exponential smoothing (`k = 1 - exp(-FOLLOW*dt)`).
- `data/copy.js` — all site text in Kt's voice (single place to edit wording).
- `data/projects.js` — the four project "worlds" and their honest status badges.

**The Wanderer treadmill.** `three/Wanderer.jsx` plays the walk action but sets `action.paused = true` and scrubs `action.time` from `scrollProgress` each frame, and zeroes the `Root` bone's x/z so he strides in place rather than translating. He stops walking at `WALK_END` (0.66). The world moving past him — not him moving — is what reads as a journey.

**Assets.** Static assets live in `public/` and are served from the site root, e.g. `public/assets/models/wanderer-web.glb` → `/assets/models/wanderer-web.glb`. Preload with `useGLTF.preload(MODEL)` at module scope (already done).

**Reduced motion** is mirrored from the OS into the store (`App.jsx`) and honored in the frame loops (e.g. `CameraRig` skips the breathing drift).

## Phase model

The build is staged (`README.md` has the checklist). `data/`, the store, scroll wiring, the camera rig, and the Wanderer walk-scrub are in place; `three/Atmosphere.jsx` is a deliberate `null` stub awaiting Phase 4 Higgsfield plates, and GSAP (a dependency) is reserved for the Phase 3 ScrollTrigger timeline and not yet wired. When a component reads as "empty," check whether it's an intentional phase stub before treating it as a bug.

## Future Architecture Direction

**Current stack:** React · Vite · React Three Fiber · Zustand · Lenis.

**Planned upgrades** (additive, in roughly this order): TypeScript · ESLint · Prettier · GitHub Actions CI · CodeRabbit · Cloudflare Pages deployment.

Guardrails on getting there:

- **Do not migrate frameworks** (Next.js, Astro, Remix, etc.) without explicit approval from Kt. The current Vite SPA is the chosen baseline.
- **Do not begin the TypeScript migration without a dedicated, approved migration plan.** TS is on the roadmap, but it lands as a deliberate, staged effort — not ad-hoc `.ts` files or a one-shot conversion.
- **Favor incremental improvements over large rewrites.** Each upgrade above should land on its own branch as a self-contained, reviewable change, not bundled into a sweeping refactor.

## Where decisions live (repo vs vault)

Per `docs/SOURCE_OF_TRUTH.md`: this **repo** owns code, build, deploy, and operational truth (`CURRENT_STATE.md`, the roadmaps). The **Obsidian vault** (`01 Projects/Khaylub.com/`) owns design and narrative decisions — voice/copy, the Wanderer story, the portal/storyboard concepts, and the Engineering Constitution. Record creative/architectural decisions in the vault; don't fork the shared docs (e.g. the Fog Journey Blueprint — the vault copy is the editable master, the `docs/` copy is a snapshot). Copy changes flow from the vault into `data/copy.js`.
