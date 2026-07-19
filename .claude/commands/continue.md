---
description: Re-prime a fresh session from the persistent docs and the last handoff
---

Resume the previous session's work. Read in this order, and do not start editing until all of it is loaded:

1. `job-tracker-mvp-brief.md` — original spec and project conventions (skip if not doing brand-new-feature work).
2. `PLAN.md` — read the "Working protocol" section at the top, "Current status", the most recent milestone section(s), and "Decisions & notes" at the bottom. This project keeps decisions inline in PLAN.md rather than in a separate DECISIONS.md.
3. `HANDOFF.md` — the last session's delta and exact stopping point.
4. `git log --oneline -15` and `git status` — confirm the repo matches what HANDOFF.md claims.

Then read the specific source files named in HANDOFF.md's stopping point.

Before doing any work:

- Tell me, in a few lines, your understanding of the goal, where we stopped, and what you're about to do.
- Flag any contradiction between `HANDOFF.md` and the actual repo state — if the handoff says something was committed and it wasn't, or files have changed since, stop and tell me rather than proceeding on a stale picture.
- If the next action is ambiguous or the handoff is missing something you need, ask instead of guessing.

Once I confirm, proceed with the next action from `HANDOFF.md`.

Do not delete `HANDOFF.md` — it will be overwritten by the next `/handoff`, and keeping it is cheap insurance if this session goes wrong.
