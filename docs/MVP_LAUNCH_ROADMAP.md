# Khaylub.com — MVP Launch Roadmap

> Decision-oriented roadmap to get Khaylub.com **publicly launched as fast as possible** while preserving the long-term Wanderer vision.
> Basis: the existing static site in `website/` is the MVP. No framework migration, no database, no new technology is introduced (none is required to launch).
> Blender / Wanderer remains **provisional** — no launch task depends on it.
>
> _Reconciled 2026-06-19 against `CURRENT_STATE.md`: favicon, SEO/Open Graph meta, and the four real project cards are already in the build; there is no loader and no social links in the current markup._

---

## 1. Exact MVP definition

**Khaylub.com MVP = the existing static site, deployed to a public URL on the real domain, with every placeholder and dead link replaced by real content, plus basic launch hygiene (title/meta, favicon, working contact + social links).**

Explicitly:
- **One page** (the current single-page site with five sections). No new pages required.
- **No 3D, no Blender asset, no framework, no build step, no database.**
- "Launched" = a visitor anywhere can reach `khaylub.com` over HTTPS, every link works, and nothing on the page is fake or lorem.

What is already done and needs no work to launch: page structure, responsive layout, scroll-reveal, reduced-motion handling, semantic HTML, favicon, SEO/Open Graph meta, `lang` and viewport tags. The build is genuinely close.

---

## 2. Minimum pages, content, assets

**Pages (complete):** 1 — the existing single page (Home / About / Projects / Journey / Contact). Nothing to add.

**Content to make real (the actual gap):**
- Social links — the current markup has **none**; optional to add GitHub/LinkedIn with real URLs (not a blocker).
- Contact email — `hello@khaylub.com` must be a mailbox that actually receives mail.
- Project cards (×4) — already real with honest badges (Khaylub.com · EyesUnclouded.ai · Cloelia.ai · Manors.ai). Remaining: add links where they exist; confirm copy.
- About bio — currently generic; confirm or replace with something true to you.
- Hero copy — confirm "Toward the Summit" framing is what you want (likely fine as-is).

**Assets (minimum):**
- Favicon — **done** (`favicon.svg` linked). Nice-to-have: a 1200×630 OG share image (`assets/og-cover.jpg` is a placeholder path today).
- That's the only required asset. Project thumbnails are CSS gradients and **ship fine as-is**; real thumbnails and an OG share image are nice-to-have, not required. This is what keeps Blender off the launch path entirely.

---

## 3. Task buckets

### Must Have Before Launch

| ID | Task | Effort | Notes |
|----|------|--------|-------|
| MH1 | Add social links (optional) — none in markup now; add GitHub/LinkedIn if wanted | 0.25h | Additive, not a blocker |
| MH2 | Working contact email | 0.25–1h | Verify a mailbox exists for the address used; depends on domain/email (links MH7) |
| MH3 | Project pass — cards already real + badged; add live/repo links, confirm copy | 0.5–1h | Mostly done; finish links |
| MH4 | About/bio truth pass | 0.5–1h | Make it accurate to you |
| MH5 | SEO/meta — title, description, Open Graph already in markup; add the OG share image | 0.25h | Mostly done; image is the gap |
| MH6 | Favicon — **done** (`favicon.svg` linked) | 0h | Already complete |
| MH7 | Domain: confirm `khaylub.com` is registered (or register); get DNS access | 0.5h + wait | Critical unknown; has external lead time |
| MH8 | Deploy static files to a static host | 0.5–1h | Netlify / Cloudflare Pages / GitHub Pages — hosting only, not new app tech |
| MH9 | Point domain at host + enable HTTPS | 0.5h + wait | DNS propagation is the wait, not the work |
| MH10 | Pre-launch QA: real phone + desktop, all links, console clean, content reveals (scroll-reveal works), quick Lighthouse | 1h | Final gate |

**Total focused effort: ~6–9 hours** (plus DNS/email propagation waiting). Comfortably inside 30 days at 1 hr/day.

### Nice to Have (post-launch, non-blocking)

| ID | Task | Effort |
|----|------|--------|
| NH1 | Real project thumbnails (screenshots now; renders later) | 1–3h |
| NH2 | OG share image | 0.5–1h |
| NH3 | ~~Loader review~~ — N/A; the current build has no loader | — |
| NH4 | JS-failure failsafe: `.reveal` elements are `opacity:0` until JS adds `is-visible`; add a `<noscript>`/CSS fallback so content shows if `script.js` fails | 0.5h |
| NH5 | ~~Update `README.md`~~ — **done** 2026-06-19 (now reflects the built static site) | — |
| NH6 | Privacy-friendly analytics (only if wanted) | 0.5h |
| NH7 | Contact form (e.g. Formspree) if `mailto:` proves insufficient | 1h |

### Future R3F / Blender Integration (deferred, provisional)

| ID | Task | Gate |
|----|------|------|
| F1 | **Blender asset inventory** | Move the real project into an accessible folder first |
| F2 | Wanderer production (`WANDERER_PRODUCTION_ROADMAP.md`) | Provisional until F1; no estimate yet |
| F3 | First static Wanderer render dropped onto the site | After F1–F2; no framework change |
| F4 | R3F / Next.js migration | Only when interactive 3D is genuinely justified (`FUTURE_VISION.md`) |

---

## 4. Dependency map

```
                 ┌─────────────────── TRACK A: CONTENT TRUTH (no external deps) ───────────────────┐
                 │  MH1 socials   MH3 projects   MH4 about   MH5 meta   MH6 favicon                │
                 │     (all independent of each other — can be done in any order)                  │
                 └───────────────────────────────────────────────────────────────────────────────┘
                                                  │
   ┌──────── TRACK B: LOGISTICS (has external lead time) ────────┐        │
   │  MH7 domain ──► MH9 DNS + HTTPS                              │        │
   │       └──► MH2 email (if using @khaylub.com)                 │        │
   │  MH8 deploy to host ──────────► (joins MH9)                  │        │
   └─────────────────────────────────────────────────────────────┘        │
                                  │                                         │
                                  └──────────────► MH10 QA ◄────────────────┘
                                                     │
                                                  LAUNCH

Does NOT block launch (any of it):
  • All Nice-to-Have (NH1–NH7) — including real thumbnails and the README fix
  • All Blender / R3F (F1–F4)
```

**Reading it:** Two tracks run in parallel. Track A (content) needs no domain or host and can be done entirely offline in the existing files. Track B (logistics) carries the only external waits (DNS, email propagation). The single cross-link is MH2↔MH7 if your contact address is `@khaylub.com`. Everything converges at MH10 QA, then launch. Blender is on a completely separate, post-launch track.

---

## 5. Effort summary

- **Critical path to launch:** ~6–9 focused hours of work + propagation waits.
- **Longest single task:** MH3 project truth pass (1–2h).
- **Tasks with external lead time (start early):** MH7 domain, MH9 DNS/HTTPS, MH2 email.
- At 1 hr/day, the *work* fits in ~7–9 sessions; the calendar is dominated by waiting for DNS/email, not by effort.

---

## 6. Highest-ROI next task

**Confirm or register the domain `khaylub.com` (MH7) — do this first.**

Why it's the highest-ROI next action, not the most fun one:
- It resolves a critical unknown (is the domain even owned/available?).
- It gates the entire logistics track (deploy is pointless without somewhere to point it).
- It carries external lead time — starting it now means DNS/email propagation happens *while* you do content work, instead of becoming the thing you wait on at the very end.
- It also unblocks MH2 (a `@khaylub.com` inbox can't work until the domain exists).

**Highest-ROI *build* task to run in parallel while DNS settles:** MH3, the project truth pass — it's the biggest credibility lever and needs no domain or host.

---

## 7. Prioritized 30-day action list

Ordered by dependency + ROI. At ~1 hr/day this leaves large slack; if you have more time per day, compress freely.

**Week 1 — unblock logistics, start content**
1. MH7 — Confirm `khaylub.com` registration; if unregistered, register it. Get DNS access. *(start the lead-time clock)*
2. MH3 — Project truth pass: list your real projects; decide which of the four cards stay; rewrite copy; gather any live/repo links. *(do while DNS propagates)*
3. MH3 — Apply the project edits to `index.html`.
4. MH4 — Rewrite the About bio to be true to you; apply to `index.html`.

**Week 2 — finish content truth + hygiene**
5. MH1 — Replace the three `#` social links with real URLs (or remove any you don't use).
6. MH2 — Stand up / confirm the contact mailbox; ensure the `mailto:` address actually receives mail.
7. MH5 — Write a real `<title>` and description; add Open Graph + Twitter meta tags.
8. MH6 — Create a favicon and link it.

**Week 3 — deploy + connect**
9. MH8 — Deploy the `website/` files to a static host (pick one: Netlify, Cloudflare Pages, or GitHub Pages).
10. MH9 — Point `khaylub.com` at the host; enable HTTPS; wait for propagation.
11. MH10 — QA pass: test on a real phone and desktop; click every link; confirm no console errors; confirm the loader reveals content; run a quick Lighthouse check.

**Launch** — once MH10 passes, the site is publicly live. That is the MVP.

**Week 4 — immediate post-launch polish (all Nice-to-Have, optional)**
12. NH5 — Update `README.md` to reflect the live static site.
13. NH4 — Add a JS-failure failsafe so `<main>` reveals even if `script.js` doesn't run.
14. NH3 — Review the 3.2s loader; shorten or skip on repeat visits.
15. NH1 — Begin replacing CSS-gradient thumbnails with real project images (screenshots now; Wanderer renders later, via the deferred Blender track).

**Parallel, anytime after launch (provisional):** F1 — move the real Blender project into an accessible folder so the Wanderer asset inventory can finally run. Everything Blender flows from that, and none of it is on the launch path.
