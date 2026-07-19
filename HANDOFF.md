# HANDOFF.md — Job Application Tracker

**Purpose:** Everything the next session needs to continue with zero re-explanation. Read this together with `PLAN.md` (the long-lived source of truth) and `job-tracker-mvp-brief.md` (original spec) — or just run `/continue`, which reads all three in the right order.

---

## Session scope

Built M8 (AI job extraction from a screenshot) end-to-end — planning was already done and recorded in the previous `HANDOFF.md`; this session executed Phase 1 through Phase 3, then kept going through four user-driven follow-ons discovered during live QA: employment/work-mode fields + Archive filters, an `internship` type addition, and a real gap fix (permanent delete, initially archive-only then extended to active applications). Also installed several Claude Code skills and reconciled the generic `/continue`/`/handoff` slash commands to this project's actual docs.

---

## Current status snapshot

- **Branch:** `main`. **Everything is committed and pushed** — `git log origin/main..HEAD` is empty, confirmed as of commit `42a38b9`.
- **Latest commit:** `42a38b9` "Add /continue and /handoff slash commands, adapted to this project's docs".
- **Working tree:** clean except the two pre-existing untracked files that are out of scope by design and should NOT be committed: `claude-code-prompts.md`, `repo-setup.md`.
- **Live in production:** https://jobtracker.fazare.dev — Cloudflare auto-deploys on every push to `main`. Confirmed live and working (user tested signed-in on the deployed site, not just localhost).
- **Typecheck:** `npx tsc -b --noEmit` passes clean (no output) — verified after every change this session.
- **M8 status:** **Done, live, verified end-to-end**, including live signed-in QA against real Supabase (dropdown persistence, extraction correctness, delete + `stage_history` cascade all confirmed by the user via the Table Editor). Nothing is stubbed, broken, or half-migrated.

---

## Commits this session (since the last `HANDOFF.md` checkpoint, commit `58ec986`)

```
42a38b9 Add /continue and /handoff slash commands, adapted to this project's docs
8cf2271 Allow deleting active (non-archived) applications too
4cdaff0 Add permanent delete for archived applications
f6441bd Show employment type / work mode on archive rows
bfdeeb5 Update PLAN.md: M8 fully confirmed live, including internship addition
cc5f57a Add internship as a fourth employment type
6d44cec Add employment type / work mode filters to the Archive view
35de8fd Add M8 Phase 3: AI extraction UI, employment type/work mode fields, guest log-in button
4636f73 Cap per-extraction token spend in extract-job-details
0cba494 Add M8 Phase 1: extract-job-details Edge Function + extraction_events table
03eb936 Add project skills: Vercel React/design guidelines + jeffallan dev specialists + karpathy-guidelines
```

Nothing stashed, nothing on a scratch branch. All pushed.

---

## Exact stopping point

There is no in-progress work. Every request raised this session — M8 and all four of its follow-ons — is built, committed, pushed, and live. This is a genuine "clean slate" stopping point, not a mid-task pause.

The very last action of the session was reconciling `.claude/commands/continue.md` and `.claude/commands/handoff.md` (originally generic templates) to reference this project's real docs (`PLAN.md`/`HANDOFF.md`) instead of a nonexistent `CLAUDE.md`/`architecture.md`/`DECISIONS.md`/`IMPLEMENTATION-PLAN.md` set — then running `/handoff` itself, which is what produced this file.

---

## What's DONE (built, verified, live) — full detail in `PLAN.md`

Everything through M7 was already done before this session (see the previous `HANDOFF.md`'s content, now folded into `PLAN.md`'s per-milestone sections). This session added:

- **M8 — AI job extraction:** `extract-job-details` Edge Function (Claude Haiku 4.5 vision + `output_config.format` structured output, quota-checked before any Anthropic call, 20/user/month + 5,000/month global caps, 5MB image size cap, `max_tokens: 500`), `extraction_events` table (`0004_extractions.sql`), client wiring (`extractJobDetails()` in `remoteStore.ts`, "Extract from screenshot" button in `ApplicationForm.tsx`). Curl-verified standalone before any UI touched it, per the M7 lesson.
- **Employment type / work mode:** `employment_type` (`full_time`/`part_time`/`freelance`/`internship`) and `work_mode` (`on_site`/`remote`/`hybrid`) as nullable columns (`0005_employment_work_mode.sql`, `0006_internship_employment_type.sql`), form dropdowns, card detail + archive row display, AI-extractable.
- **Archive filter UI:** generic `MultiSelectFilter<T>` component (`src/components/MultiSelectFilter.tsx`), extracted from what used to be `ArchiveView`'s one-off `ReasonFilter`, now powering three filters (Reasons, Employment, Work mode). Accessibility pass added `aria-expanded`/`aria-haspopup`/Escape-to-close-with-focus-return.
- **Guest "Log in" button:** separate sidebar item, reversing the M7-era decision to only reach login via the sign-up modal's toggle.
- **Permanent delete:** `deleteApplication` wired end-to-end (`localStore.ts` already had it, unused, until now; added `deleteRemoteApplication` to `remoteStore.ts`; `DeleteApplicationModal.tsx` for one-click confirm). Available on both active board cards and archived applications (small trash icon, same component/style in both `CardDetail.tsx` and `ArchiveView.tsx`'s `ArchiveRow`).

**Full narrative, including the bug found and fixed (a nullable-enum structured-output schema Anthropic rejected — fixed with `anyOf` instead of `type: [...] + enum`) and the scope reversals (delete: archive-only → everywhere; login: toggle-only → separate button), is in `PLAN.md`'s "M8" and "Post-M8" sections. Don't re-derive it — read it there.**

---

## Next action

None queued. Everything requested has been built, verified, and shipped. The next action is whatever the user raises next — there is no punch list to work through first.

---

## Learned this session (not yet obvious from the diff)

- **Anthropic structured-output schemas reject `{type: [..., 'null'], enum: [...]}` for a nullable enum**, even though it's valid JSON Schema. The fix is `{anyOf: [{type: 'string', enum: [...]}, {type: 'null'}]}`. Hit this exact bug once (employment_type/work_mode), fixed it, confirmed via redeploy + live test. If a future field ever needs a nullable enum in a structured-output schema, use `anyOf` from the start.
- **`localStore.ts` already had a fully-working `deleteApplication(id)` function that was never called anywhere** — a real "we forgot to wire this up" gap, not something that needed writing from scratch. Worth a quick grep (`grep -rn "functionName\b" src`) before assuming a capability needs building when the request sounds like it "should already exist."
- **Two product-scope decisions made during this session's *own* live QA got reversed within the same session**, both driven by actual usage friction rather than upfront planning: (1) delete was scoped to archive-only, then the user found "archive first, then delete" too much friction and asked for it everywhere — reversed same-day; (2) this mirrors the M7-era login-toggle-only decision, which also got reversed this session after being called "confirmed as the intended behavior, not a gap" back in `PLAN.md`. Neither reversal needed heavy process — the user just said what wasn't working and it got fixed. Worth remembering: a documented "deliberate decision" isn't sacred if real usage contradicts it; don't resist reversing it just because it was written down before.
- **The browser-automation preview tab goes stale after several HMR reloads** (`read_page` returns "(empty page)", `Viewport: 0x0`) — a `navigate` with `force: true` to the same URL does NOT fix it. The reliable fix is `tabs_create` (a fresh tab) + `navigate`. Hit this pattern repeatedly this session; just open a new tab rather than fighting a stale one.
- **This project's `.claude/skills/` now has 12 installed skills** (Vercel composition-patterns/react-best-practices/design-guidelines/writing-guidelines, jeffallan's react-expert/typescript-pro/database-optimizer/prompt-engineer/secure-code-guardian/debugging-wizard/the-fool, and karpathy-guidelines) — see commit `03eb936` for the full provenance (which GitHub repo each came from). They auto-trigger; no need to invoke by name. Used `vercel-composition-patterns` and `web-design-guidelines` explicitly this session (for the `MultiSelectFilter` extraction decision and its accessibility pass, respectively) and they were genuinely useful — worth reaching for again on similar UI-architecture or accessibility questions.
- **`/continue` and `/handoff` are now real commands in this repo** (`.claude/commands/`), edited to reference `PLAN.md`/`HANDOFF.md` instead of their original generic doc-set assumption. This very file was produced by running `/handoff`.

---

## Open questions / deferred

None. Every deferred item raised earlier in the project's life (see `PLAN.md`'s "Postponed / deferred" section) has since been built or closed out — that section is currently empty of open items.

One thing that's a live *operational* concern, not a code task: **the Anthropic account backing `extract-job-details` only has its original small test credit loaded, with auto-reload off.** Now that AI extraction is live for real users, that balance is the practical ceiling on usage (the 5,000/month code constant is a forward-looking ceiling, not the current real one). The user was told to decide when to top it up; as of this handoff, no confirmation either way that it's been done. Worth asking early next session if extraction-related errors come up.

---

## Verify

```bash
# 1. Typecheck — expect NO output (clean pass)
npx tsc -b --noEmit

# 2. Working tree — expect ONLY the two untracked scratch files
git status --short
#   ?? claude-code-prompts.md
#   ?? repo-setup.md

# 3. Everything pushed — expect EMPTY output
git log origin/main..HEAD --oneline

# 4. Latest commit — expect: 42a38b9 Add /continue and /handoff slash commands, adapted to this project's docs
git log --oneline -1

# 5. Run locally
npm run dev     # then open the printed localhost URL
```

- **Production:** open https://jobtracker.fazare.dev — should render the app; if signed in, "Extract from screenshot" should appear in the add-application form, and Employment type/Work mode dropdowns (including "Internship") should be present.
- **Nothing here needs re-verification** — everything above was confirmed live by the user during this session, most recently the delete feature's signed-in QA (row disappears from `applications`, `stage_history` cascades, confirmed via the Table Editor).
