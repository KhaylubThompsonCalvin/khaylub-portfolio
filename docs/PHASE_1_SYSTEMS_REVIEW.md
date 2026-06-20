# Khaylub.com — Phase 1 Systems Review

> Senior Systems Analyst / Product Owner review of the realistic near-term objective: take the **existing static site** (`website/`, see `CURRENT_STATE.md`) from placeholder content to a public launch.
> The documented R3F/Next.js "Phase 1" in `build-plan.md` is treated as **deferred future scope** (per `CONSOLIDATION_REPORT.md` / `FUTURE_VISION.md`), not the current plan.
> Blender / Wanderer asset state is **provisional** — the active Blender project is outside MCP-accessible folders and has not been inventoried.

---

## A. Assumptions currently baked into the plan

1. **"Phase 1 = 3D hero."** `build-plan.md` and `architecture.md` assume Phase 1 is a Next.js + R3F + GLB landing page. Reality: a zero-dependency static Phase 1 already shipped. The plan and the product disagree.
2. **The site needs Blender/3D to launch.** It does not. The live static site can go public today with real content; 3D is an enhancement, not a prerequisite.
3. **Blender assets exist / are progressing.** Unknown. The accessible workspace is empty and the real project is elsewhere. No assessment should depend on this until inventoried.
4. **The four project cards represent real projects.** The live site shows Eyes Unclouded, Summit Render, Trail Engine, Horizon Brand — copy is placeholder. Which (if any) are real, shippable, linkable projects is undecided.
5. **Multi-page routing is needed.** `architecture.md` assumes `/work`, `/work/[slug]`, `/about` routes. The live site is single-page anchors and works fine for a small portfolio.
6. **Hosting is Vercel.** Vercel is only required by the (deferred) Next.js plan. A static site can deploy to any static host.
7. **The domain `khaylub.com` is owned and pointable.** Not verified anywhere in the docs.
8. **Audience/purpose is settled.** The "learning journey" theme implies a personal/portfolio-for-growth framing, but the primary goal (hiring, freelance clients, school, personal brand) is unstated — and it changes content priorities.
9. **A contact form is wanted.** Current contact is `mailto:` + placeholder social links; whether a real form is needed is undecided.

---

## B. Missing Information Report

**Content (blocks launch):**
- Real project inventory — which projects are real, how many, and their details (see §D).
- Canonical About/bio copy.
- Real contact email + real social URLs (currently `#` placeholders).
- Project media — do screenshots/thumbnails exist, and where?

**Logistics (blocks launch):**
- Is `khaylub.com` registered? Is DNS access available?
- Chosen static host (none configured yet).
- Contact method decision (mailto vs. form service).

**Direction (shapes scope):**
- Primary goal/audience of the site.
- Any deadline (job applications, course milestone)?
- Expected content cadence — projects added often (favors data-driven) or rarely (hardcoding is fine)?
- Analytics desired at launch?

**Provisional / unknown (do not block launch, must not be guessed):**
- Actual state of the Blender Wanderer work: character, clothing, backpack, rigging, animation, Spring prototype. Pending a real inventory once the project folder is in an accessible path.

---

## C. Required Decisions (before further development)

| # | Decision | Options | Recommendation |
|---|----------|---------|----------------|
| 1 | Definition of "launch" | (a) static site + real content live; (b) wait for 3D hero | (a) — ship the static site with real content |
| 2 | Near-term stack | Stay static; or migrate to Next.js/R3F now | Stay static; defer R3F until its trigger condition (`FUTURE_VISION.md`) |
| 3 | Page model | Single-page anchors; or multi-route | Single-page (matches live site; fine for a small portfolio) |
| 4 | Project content storage | Hardcode in HTML; or `projects.json` + render loop | `projects.json` if ≥ ~5 projects or frequent updates; else hardcode (see §D) |
| 5 | Domain | Register `khaylub.com`; or use a host subdomain to start | Register if available; subdomain is an acceptable interim |
| 6 | Host | Netlify / Vercel / Cloudflare Pages / GitHub Pages | Any static host; pick one and document it |
| 7 | Contact | `mailto:` only; or a form service (Formspree/Resend) | `mailto:` for launch; form later if spam/volume warrants |
| 8 | SQLite | Use now; or not | **Not now** — no relational/queryable need exists yet (see §E) |
| 9 | Primary goal/audience | hiring / freelance / school / personal brand | Decide explicitly; it reprioritizes content |

---

## D. Data to collect now (eases all future work)

Collecting this once now serves the current static site, a future `projects.json`, and future case studies — the same data, captured properly, avoids redoing it three times.

**Canonical project inventory** — per project:
`title`, `slug`, `discipline/tags`, `year`, `role`, `short_description` (card), `long_description` (case study), `links` (live, repo), `media` (thumbnail/render paths), `status` (live | wip | concept), `featured` (bool).

**Brand/design tokens** — the palette and fonts already in `styles.css` (sky blues, dawn warm `#e8b87a`, sun `#f4c56a`, Georgia display / system-ui body). Capture as a small tokens reference so any future migration reuses the identity verbatim.

**Identity/contact** — canonical bio, real email, real social URLs.

**Asset register** — where renders/screenshots live and the naming convention used.

**Blender asset register** *(once the real folder is accessible)* — map each `.blend` → purpose → export status, following the export-log template already in `blender-export-pipeline.md`.

---

## E. Data Model Recommendation

**Obsidian / Markdown (the knowledge base — prose you read and edit):**
- Planning, decisions, narrative. Your `docs/` folder already is this.
- Project briefs and case-study drafts, the decision log, roadmaps, Blender production notes, references/mood boards.
- Rule of thumb: if it's read as prose, it lives here.

**JSON (`projects.json` — structured content the site renders):**
- The canonical project inventory from §D, in one file the static page consumes (and a future Next.js app can reuse unchanged).
- Removes per-project HTML editing; one schema, many cards.
- Suggested schema (extends the one already in `architecture.md`):
  ```json
  {
    "slug": "eyes-unclouded",
    "title": "Eyes Unclouded",
    "discipline": "Web",
    "tags": ["AI", "design"],
    "year": 2026,
    "role": "Designer / Developer",
    "short": "One-line summary for the card.",
    "long": "Longer case-study body.",
    "links": { "live": "", "repo": "" },
    "media": { "thumbnail": "", "render": "" },
    "status": "wip",
    "featured": true
  }
  ```

**SQLite — not now (decide explicitly to avoid over-engineering):**
- A static portfolio with a handful of projects has no relational, high-volume, or queryable need that JSON cannot serve.
- Adopt SQLite only when a real trigger appears: a blog/notes section needing tag search, stored-and-queried contact submissions, or analytics events. Until then it adds a backend, a build step, and maintenance for zero benefit.

---

## F. Reusable templates to establish

| Template | Form | Purpose |
|----------|------|---------|
| Project entry | JSON schema (§E) + markdown brief | One definition feeds cards, case studies, future app |
| Case study | Markdown: problem → approach → outcome → media | Consistent project write-ups |
| Project card | The existing `.project-card` HTML/CSS pattern | Already reusable; document it as the canonical card |
| Section block | The `.section / .section__inner / .section__header` pattern | Consistent new sections |
| Journey milestone | The timeline-item pattern | Adding milestones without re-coding |
| Decision-log entry | date / decision / options / rationale / status | Traceable choices in Obsidian |
| Blender export log | The template already in `blender-export-pipeline.md` | Per-asset export record |

---

## G. Revised Development Sequence

This revises `build-plan.md` by **deferring the R3F/GLB Phase 1** and sequencing the realistic path to a public static launch first.

**Step 0 — Decisions (resolve §C).** Lock launch definition, stay-static, page model, host, contact method, and the real project list. Blocks everything; cheap to do.

**Step 1 — Collect project data (§D).** Build the canonical project inventory once. Decide hardcode vs. `projects.json` based on count/cadence (Decision 4).

**Step 2 — Real content into the static site.** Replace placeholder project cards, About copy, social links, and contact with real content. No architecture change.

**Step 3 — (Optional) Extract to `projects.json`.** Only if Decision 4 favored it: move projects to JSON + a small render loop in `script.js`. Skip if hardcoding is sufficient.

**Step 4 — Launch.** Register/point domain, deploy to the chosen static host, add basic SEO/meta and OG tags, run an accessibility pass and Lighthouse. This is the real "Phase 1 complete."

**Step 5 — Blender Wanderer (parallel/after, provisional).** Advance `WANDERER_PRODUCTION_ROADMAP.md` once the real Blender files are inventoried. First payoff is a single static **render** dropped onto the site (e.g., behind the hero or the "Summit Render" card) — no framework change.

**Step 6 — R3F migration (future trigger only).** Adopt Next.js/R3F per `FUTURE_VISION.md` *only* when there's animated 3D and an interaction a static image can't fake. Not before.

---

## H. Top risks specific to this sequence

| Risk | Mitigation |
|------|------------|
| Plan/reality drift (docs say R3F, site is static) | This review + keeping `CURRENT_STATE.md` authoritative |
| Launch stalls waiting on 3D that isn't required | Steps 0–4 have zero Blender dependency |
| Placeholder content ships by accident | Step 2 gate: no launch with `#` links or lorem copy |
| Over-engineering (premature JSON/SQLite/Next.js) | Decisions 4 and 8 default to the simplest option |
| Blender assumptions baked in prematurely | All Blender items flagged provisional until inventory |
