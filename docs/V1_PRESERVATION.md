# V1 Preservation Record (Khaylub.com V1, the 3D Experiment)

Recorded 2026-09-07 at the V2 planning gate, Phase 0 (Preserve V1). This file is the repository-side
record of how V1 was frozen and how to recover or redeploy it. The design and decision record lives in
the Obsidian vault (`01 Projects/Khaylub.com/docs/V2/`, starting at `Khaylub.com V2 - Planning MOC.md`).
Nothing in V1's source was changed by Phase 0; this file is the only addition, and it is added on a
branch so that merging it (which triggers a Render redeploy of identical code) stays the owner's call.

## 1. Identity of the preserved version

| Item | Value |
| --- | --- |
| Preserved commit | `67edcc7f06c147d21a86650f172e73c909625e93` (merge of PR #30, `polish/motion-type-spec`, 2026-07-05 20:27 PDT) |
| Tree identity | identical to `8adec6f` (the branch tip); `git diff --stat 8adec6f 67edcc7` is empty |
| Annotated tag | `v1.0.0-3d-experiment` (tag object `d01b8e9`, points at `67edcc7`) |
| Legacy branch | `legacy/v1-3d-experiment` at `67edcc7`, locked read-only on GitHub |
| GitHub Release | https://github.com/KhaylubThompsonCalvin/khaylub-portfolio/releases/tag/v1.0.0-3d-experiment (published 2026-09-07, asset `khaylub-v1-2026-09-07.png`, 1440 x 900 entry screenshot) |
| Default branch | `main` (protected: pull request required, CodeRabbit status check, admins enforced, no force pushes, no deletions) |
| Tag protection | repository ruleset "Protect V1 tags" (id 22492312): `refs/tags/v1.*` cannot be deleted, updated, or force-pushed; no bypass actors |
| Live since | 2026-06-24 (site); this commit deployed 2026-07-06 03:28 UTC (`last-modified` header) |

## 2. Live build verification (2026-09-07)

| File | Live md5 | Fresh clone build md5 (`npm ci && npm run build` at `67edcc7`, Node 22.14.0, npm 10.9.2) | Bytes |
| --- | --- | --- | --- |
| `index.html` | `87cdf35f42e82b6836d271c1f597ead4` | `87cdf35f42e82b6836d271c1f597ead4` | 3,985 |
| `assets/index-fyrvR9f9.js` | `77d2fa0877a29254932fe53a0d3c3010` | `77d2fa0877a29254932fe53a0d3c3010` | 1,101,249 |
| `assets/index-DjHx2cGa.css` | `a3f80eb61bb52f0ad1243e329d508843` | `a3f80eb61bb52f0ad1243e329d508843` | 14,777 |

All three hashes are identical across the live site, the local `dist/` built 2026-07-05, and a fresh
clone. The tagged commit therefore reproduces production exactly.

## 3. Deployment settings

Facts inspectable from outside the host (2026-09-07):

| Setting | Value | Source |
| --- | --- | --- |
| Host | Render, static site | `rndr-id` response header; `www` CNAME to `khaylub-portfolio.onrender.com` |
| Render service name (inferred) | `khaylub-portfolio` | CNAME target |
| Deploy trigger | auto-deploy on push to `main` | `last-modified` 39 s after PR #30 merged; `docs/CURRENT_STATE.md` |
| Build command (inferred) | `npm ci && npm run build` (Vite) | `package.json`; reproduces the live bundle |
| Publish directory (inferred) | `dist` | `vite.config.js` (`outDir: 'dist'`) |
| Custom domains | `khaylub.com` (A `216.24.57.1`), `www.khaylub.com` (CNAME `khaylub-portfolio.onrender.com`); `www` and `http` redirect 301 to `https://khaylub.com/` | `nslookup`, `curl -sI` |
| DNS provider | Namecheap default nameservers (`dns1/dns2.registrar-servers.com`) | `nslookup -type=NS` |
| Response headers live | `cache-control: public, max-age=0, s-maxage=300` on every asset; `x-content-type-options: nosniff`; no HSTS, CSP, X-Frame-Options, Referrer-Policy, or Permissions-Policy | `curl -sI` |
| `public/_headers` | present in the repo but has no effect on Render (Netlify and Cloudflare Pages convention) | audit |
| `render.yaml` | none in the repo; settings are dashboard-managed | repo |

Needs Confirmation (owner, from the Render dashboard; not inspectable from outside): exact build command
and publish directory as configured, Node version setting, header and redirect rules if any, PR preview
setting, the workspace's bandwidth and pipeline-minute allowances. Transcribe them into this table when
convenient.

## 4. Unmerged work at freeze (decisions, per the preservation strategy)

| Branch or item | State vs `main` | Decision | Executed |
| --- | --- | --- | --- |
| PR #26 `fix/journey-flow-complete` (`74a1e50`) | 1 ahead, 8 behind | Close unmerged (would regress the de-slopped copy of PR #28 and PR #29); keep the branch | Decision recorded. Closing the PR needs an owner click on GitHub: the tokens available to the automation lack pull-request write scope (HTTP 403, 2026-09-07). |
| `feature/growth-ledger-prep` (local only) | 1 ahead, 79 behind | Keep the branch; its `docs/GROWTH_LEDGER.md` was copied into the vault as V2 planning input; the `theme -> tags` rename is obsolete | Copied 2026-09-07 |
| `chore/gitignore-mcp-backup` (local only) | 1 ahead, 101 behind | Keep; ineffective one-liner (file already tracked); no action | n/a |
| `origin/master`, `origin/mvp-homepage`, `origin/local-mvp-import` | pre-R3F lineage | Keep as history; never merge | n/a |
| `stash@{0}` project-detail WIP | superseded by merged `ProjectDetail.jsx` | Keep; do not apply | n/a |
| Local merged branches (22) | merged | Keep; deleting local branches is unnecessary | n/a |
| Stale remote-tracking refs (10) | deleted on GitHub | Pruned locally with `git fetch --prune` on 2026-09-07 | Done |

## 5. Frozen-scope policy

- V1 receives security fixes only (dependency vulnerabilities, header fixes), each on a branch, merged
  by pull request, and tagged `v1.0.x`. No visual, content, or structural changes.
- The tag `v1.0.0-3d-experiment` is never moved. A fix produces a new tag.
- Optional, owner decision D-04 in the vault: a small `render.yaml` that makes the already-written
  security and cache headers apply on Render. Not applied in Phase 0 (default: tag as-is).
- After V2 launches, V1 is served at `v1.khaylub.com` from this tag (planned host: GitHub Pages, `noindex`
  with a canonical link to the V2 case study). After the V1 case study is published, this repository may
  be marked archived on GitHub with the owner's approval.

## 6. How to recover or redeploy V1

```
git clone https://github.com/KhaylubThompsonCalvin/khaylub-portfolio.git
cd khaylub-portfolio
git checkout v1.0.0-3d-experiment
npm ci
npm run build      # produces dist/ ; hashes should match section 2
npx vite preview   # local check
```

Deploy `dist/` to any static host. On Render: static site, build `npm ci && npm run build`, publish `dist`.

## 7. Related records (vault)

- `01 Projects/Khaylub.com/docs/V2/02 - V1 Audit.md` (read-only audit, 2026-09-07)
- `01 Projects/Khaylub.com/docs/V2/03 - V1 Preservation Strategy.md`
- `01 Projects/Khaylub.com/docs/V2/ADR/ADR-009 - Repository Model and V1 Exhibit.md`
- `01 Projects/Khaylub.com/ai-docs/2026-09-07 - V2 Checkpoint - Phase 0 Preserve V1.md`
