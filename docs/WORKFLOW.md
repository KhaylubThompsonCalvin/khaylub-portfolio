# Workflow — Khaylub.com

> **North star:** the purpose of this workflow is to **accelerate learning and shipping, not to
> replace understanding.** Every implementation should leave the project **more maintainable** and
> the creator **more knowledgeable**.

Khaylub.com is built by a creator learning design and engineering in public. The tools (Higgsfield,
21st.dev, the UI/UX Pro Max skill) and the AI are a **design team _and_ a teacher** — never a black
box. Speed is the means; understanding is the goal. If a change can't be explained simply, it isn't
done.

## The pipeline

```
OBSIDIAN ──────── Source of truth (idea / feeling)
   ▼
STORYBOARD ────── "What should the user feel?" (the 6 beats)
   ▼
ASSETS ────────── Blender · Tripo · Higgsfield (the look + 3D)
   ▼
IMPLEMENT ─────── React · R3F · CSS (build it)
   ▼
VERIFY ────────── Lint · Build · Manual QA (is it right + does it feel right?)
   ▼
PR ────────────── CodeRabbit review (findings are blockers)
   ▼
MERGE ─────────── A human clicks merge (never the AI)
   ▼
DOCUMENT ──────── ADR + vault notes (record the why)
```

## Who does what — and what you learn

| Stage           | System does                                                               | You do                                                    | What you take away                       |
| --------------- | ------------------------------------------------------------------------- | --------------------------------------------------------- | ---------------------------------------- |
| **Storyboard**  | I direct the narrative from your meaning (trail of life, phoenix)         | Approve the _emotion_ per beat                            | How intent becomes structure             |
| **Assets**      | Higgsfield makes the look; Tripo/Blender the 3D props                     | React to images ("more sunrise")                          | What art direction reads as on screen    |
| **Implement**   | I build it; design comes from UI/UX Pro Max + 21st.dev, adapted to tokens | Nothing to write — but I explain the _why_ of each choice | How the design decision maps to the code |
| **Verify**      | Lint/build/format must be green; I run them                               | The one human check: does it feel right?                  | What "correct" vs "good" looks like      |
| **PR / Review** | CodeRabbit reviews; I resolve findings                                    | Read the plain-English summary                            | What reviewers catch and why             |
| **Merge**       | —                                                                         | Click merge                                               | Ownership: you ship it                   |
| **Document**    | I write the ADR + vault note (what changed, why, what it teaches)         | —                                                         | A growing record you can re-read         |

So your role across the loop is: **describe the feeling → react to a few images → say "yes, that
feels right" → merge.** Everything between is tool- and AI-driven — _and narrated back to you_ so the
understanding compounds.

## The two loops

- **Macro loop:** the full pipeline above, once per feature/beat.
- **Micro loop:** _generate → react → regenerate_ (assets) and _build → review → refine_ (code). We
  iterate on **images and small diffs**, which are cheap — never on big rewrites. Getting it wrong the
  first time is expected and fine.

## Learning is a deliverable (not a side effect)

- Every **PR description** and **ADR** explains the _why_ in plain language — "what changed, why this
  approach, what it teaches" — not just the what.
- Code stays **simple, focused, and maintainable** (per `CLAUDE.md`: no AI slop, explain decisions,
  keep components focused). Cleverness that can't be explained is rejected.
- Decisions + rationale live as **ADRs** (`docs/adr/`) and **vault notes**, so the project gets more
  maintainable and the creator more knowledgeable with each pass.

## Tool roles & activation status

| Tool                 | Stage              | Status                                                              |
| -------------------- | ------------------ | ------------------------------------------------------------------- |
| **Higgsfield** MCP   | Assets (the look)  | ✅ live                                                             |
| **Tripo / Blender**  | Assets (3D props)  | manual → `public/assets/models/`                                    |
| **21st.dev** Magic   | Implement (UI ref) | ⚙️ configured; needs `MAGIC_API_KEY` in env + account (Mode B only) |
| **UI/UX Pro Max**    | Implement (design) | ✅ skill available                                                  |
| **Filesystem**       | Implement          | ✅ native repo access (Read/Write/Edit/Bash)                        |
| **Git + CodeRabbit** | PR / Review        | ✅ live                                                             |
| **Obsidian** MCP     | Plan / Document    | ⚠️ connected; needs API key (Local REST API with MCP)               |

This document is the operating model every task follows. It reinforces `CLAUDE.md` (21st.dev Mode B,
CodeRabbit findings are blockers, humans merge, ADRs record rationale).
