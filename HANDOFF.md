# HANDOFF.md — Job Application Tracker

**Purpose:** Everything the next session needs to continue with zero re-explanation. Read this together with `PLAN.md` (the long-lived source of truth) and `job-tracker-mvp-brief.md` (original spec) — or just run `/continue`, which reads all three in the right order.

---

## Session scope

Ran a one-off deep read-only audit of the whole repo (producing `AUDIT.md`), then fixed findings in severity order: password reset, every High, the two Mediums sharing a root cause with them, a test suite + CI gate, and all eleven Lows. Also added Anthropic token tracking per extraction, lost an afternoon to an unexplained data-loss incident, and planned the remaining Mediums.

---

## Commits this session

```
6b21841 Track per-extraction Anthropic token usage
06e0352 Clear all Low-severity audit findings (L1-L11)
ee1d344 Add automated tests + CI gate (H4 from AUDIT.md)
d9167a6 Surface write failures instead of failing silently (H3/M8 from AUDIT.md)
b4f5a4b Fix guest-migration timing bugs (H1/M6 from AUDIT.md)
d7fdc2a Add password reset flow (forgot password + set new password)
```

All pushed (`git log origin/main..HEAD` empty). Nothing stashed, no scratch branches. Working tree clean apart from three deliberately-untracked files: `AUDIT.md`, `claude-code-prompts.md`, `repo-setup.md`.

---

## Exact stopping point

**Nothing is in progress, stubbed, broken, or half-migrated.** Every commit above is complete, typechecked, linted, tested, and pushed. This is a clean boundary, not a mid-task pause.

The last thing done was planning (no code): the remaining Mediums were designed into three batches and approved. The plan lives at **`/Users/burak2/.claude/plans/let-s-get-all-the-joyful-deer.md`** — read it before starting, it contains implementation detail not repeated here.

Two things deliberately left undone, both requiring the Supabase dashboard:
- **The live `delete-account` Edge Function is still deployed.** Commit `06e0352` deleted `supabase/functions/delete-account/index.ts` from the repo (L4), but the deployed function is untouched and still reachable. Nothing calls it — `remoteStore.ts` only calls `account-action` — so this is cleanup, not a live bug.
- **`AUDIT.md` section D** still has open dashboard-only questions, most importantly **D1: is the Supabase spend cap actually ON?** That's a brief §3 non-negotiable and remains unverified.

---

## Next action

Start **Batch 1** of the approved plan: M1, M3, M4, M7. All four are client-side and verifiable locally in guest mode; they belong in one commit.

- **M1** — `src/lib/export.ts`: `buildExportData()` returns only `applications` + `stage_history`, so every exported `tracker_id` dangles. Add `trackers` using the existing `getAllRemoteTrackers(userId)` / `getAllTrackers()`.
- **M3** — add `.order('created_at', { ascending: true })` to `getAllRemoteApplications`, `getAllRemoteTrackers`, `getAllRemoteStageHistory` in `src/lib/remoteStore.ts`, and sort the local path in the `refresh()` of `useApplications.ts` / `useTrackers.ts` so guest and signed-in agree.
- **M4** — `src/components/Board.tsx`, the keydown effect around line 194: it checks `metaKey || ctrlKey` + `'z'` with no look at `event.target`, so Cmd+Z while typing un-archives instead of undoing text. Bail on `input` / `textarea` / `select` / `isContentEditable`.
- **M7** — `src/components/Card.tsx` needs an `onKeyDown` where **Enter** opens the detail view (Space is dnd-kit's drag-pickup key, so Enter avoids the collision). `src/components/TrackerTabs.tsx` needs its tab made focusable — **note the trap:** the delete `✕` is nested *inside* the tab element, so the tab cannot simply become a `<button>`; keep an outer `div` and use two sibling buttons (label + `✕`), and add `focus-visible:opacity-100` beside the existing `group-hover/tab:opacity-100`.

---

## Learned this session

Durable findings already went into `PLAN.md`'s "Decisions & notes" (migration redesign, test-tooling gotchas, multi-file Edge Function deploys, modal-dismissal convention, the M5 reversal, the data-loss incident, key-rotation session invalidation). Not repeated here. What's left that fits nowhere else:

- **The codebase already passed `tsc --strict` before strict was enabled.** Turning it on (L6) was a one-line change with zero errors. Don't assume a config flag implies a migration effort — trial-compile first.
- **`AUDIT.md` is untracked on purpose but is load-bearing.** Every remediation commit message references its IDs (H1, L7, M3…), so `git log` is only fully legible with that file present. It's on disk and survives `/clear`; it is *not* in git, so it would not survive a fresh clone. Flagged to the user; they left it untracked.
- **Rabbit hole not worth re-entering: the data-loss investigation.** Several hours went into it across app code, migrations, Postgres logs and API logs, and it ended genuinely unresolved (details + the one remaining lead are in `PLAN.md`). Do not re-derive it from scratch if the user mentions it — read the note and ask what changed.
- **Live-auth flows still can't be verified from inside this environment** (unchanged from M5/M6/M8). Everything touching a real session — password reset round trip, the migration prompt, the extraction counter, cache eviction — was built, typechecked, and then handed to the user for live QA. Plan for that split rather than promising end-to-end verification.
- **Uncertain, worth watching:** the first token measurement after adding tracking was **2122 in / 64 out**, against ~1093/82 recorded during M8. That's ~2x input. I don't know whether the schema growth (employment_type/work_mode) caused it or it was just a bigger screenshot — one sample proves nothing. The user intends to run ~20 back-to-back extractions for a real average.

---

## Open questions

- **D1 — is the Supabase spend cap on?** Unverified, and it's a stated non-negotiable. Worth confirming early.
- **Should `AUDIT.md` be committed?** It's currently untracked. Arguments both ways in "Learned this session"; the user hasn't decided.
- **Extraction budget.** Once the ~20-extraction average exists, revisit whether `PER_USER_MONTHLY_LIMIT = 20` and `GLOBAL_MONTHLY_LIMIT = 5000` (in `supabase/functions/extract-job-details/index.ts`, mirrored for display in `src/lib/extraction.ts`) are still the right numbers. Note the Anthropic account still holds only its small original test credit with auto-reload off — that balance, not the code constant, is the real ceiling today.
- **Batch 2 trade-off, pre-agreed but worth re-confirming when you get there:** the M2 rework deletes `supabase/functions/extract-job-details/quota.ts` and `quota.test.ts`, since a Postgres RPC takes over enforcement. That removes the only Edge-Function unit test in the repo.

---

## Verify

```bash
# 1. Typecheck (now strict), lint, tests — expect clean; oxlint prints ONE
#    pre-existing warning about a missing 'handleUndo' dep in Board.tsx
npx tsc -b --noEmit
npx oxlint
npm test                      # expect: 5 files, 16 tests, all passing

# 2. Working tree — expect ONLY the three untracked files
git status --short
#   ?? AUDIT.md
#   ?? claude-code-prompts.md
#   ?? repo-setup.md

# 3. Everything pushed — expect EMPTY
git log origin/main..HEAD --oneline

# 4. Latest commit — expect: 6b21841 Track per-extraction Anthropic token usage
git log --oneline -1

# 5. Run locally
npm run dev
```

- **Production:** https://jobtracker.fazare.dev (Cloudflare auto-deploys every push to `main`). Also worth glancing at the repo's **Actions** tab — CI was added this session (`.github/workflows/ci.yml`) and its runs have not been checked yet.
- **Already verified, don't redo:** guest-mode behaviour for every Low fix (safe-link rendering, maxLength caps, Escape/backdrop modal dismissal), and the user's live QA of password reset and the H3 golden path.
