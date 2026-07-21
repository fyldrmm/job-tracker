---
description: Commit work, update the plan, and write a session delta before clearing
---

I am about to /clear. Persist all state to disk. Durable project knowledge belongs in the permanent docs, NOT in this file — this file carries only what happened this session.

## Step 1 — Secure the work (do this first)

- Run `git status` and `git diff --stat`.
- If there are uncommitted changes, commit them now, even as WIP: `git add -A && git commit -m "wip: <specific description>"`. Never leave work only in the context window.
- Run `git log --oneline -15` and note which commits are from this session.

## Step 2 — Update the persistent layer

If anything this session changed the project's durable truth, record it rather than describing it only in the handoff. Durable knowledge is split across two files: `PLAN.md` holds current status + the active milestone; `PLAN-ARCHIVE.md` holds completed milestones and the full decisions/gotchas log. There is no separate architecture.md/DECISIONS.md/CLAUDE.md.

- A decision from the *active* milestone (library choice, schema, pattern, tradeoff accepted) → append to `PLAN.md`'s "Decisions & notes" stub for now, with the choice, the alternatives rejected, and why.
- New convention, gotcha, or setup step that applies beyond this task → also `PLAN.md`, near the active milestone section.
- **When a milestone is finished**, move its milestone section and its decision bullets out of `PLAN.md` into `PLAN-ARCHIVE.md` (append under the relevant heading), and leave a one-line entry in `PLAN.md`'s milestone index. This is what keeps `PLAN.md` light — it is re-sent in full every turn.

State explicitly which parts of `PLAN.md` / `PLAN-ARCHIVE.md` you updated, or that none needed updating.

## Step 3 — Update the task plan

Update `PLAN.md`'s "Current status" section and the active/most recent milestone's checklist:
- Tick completed items.
- Add any tasks discovered this session that weren't in the original plan.
- Mark the item currently in progress and how far into it we got.

## Step 4 — Write HANDOFF.md (delta only)

Overwrite `HANDOFF.md` with:

**Session scope** — one line: what this session was working on.

**Commits this session** — hashes and messages, plus anything stashed or on a scratch branch.

**Exact stopping point** — the precise state we're in. Name the file, function, and line region. If something is stubbed, broken, half-migrated, or commented out, say so explicitly. This is the highest-value section; be uncomfortably specific.

**Next action** — the single next thing to do, concrete enough to start immediately without re-reading the whole codebase.

**Learned this session** — things discovered that are NOT yet in the permanent docs and not obvious from the diff: why an approach failed, a surprising API behavior, a test that's flaky, a rabbit hole not worth re-entering.

**Open questions** — anything I need to decide, or that we deferred.

**Verify** — exact commands to confirm current state, and what passing output looks like.

## Rules

- Use real identifiers everywhere: file paths, function names, variable names, error strings. Never "the function" or "some tests."
- Do not restate anything that lives in `PLAN.md` — reference it by name instead.
- Preserve reasoning, not just outcomes. The *why* is the first thing lost when context is compressed.
- If you are unsure or inferring rather than certain, mark it as such instead of stating it flatly.
- Do not summarize the code. The diff is the record of what changed; this file records what a person can't reconstruct from the diff.

## Step 5 — Report

Print a short summary of what you wrote and where, then explicitly flag anything you were unsure how to capture, so I can fill it in before clearing.
