# HANDOFF.md — Job Application Tracker

**Purpose:** Everything the next session needs to continue with zero re-explanation. Read this together with `PLAN.md` (the long-lived source of truth) and `job-tracker-mvp-brief.md` (original spec) — or just run `/continue`, which reads all three in the right order.

---

## Session scope

Closed out the remainder of `AUDIT.md`: section C (missing pieces), section D (needs-verification), the M6-regression bug that section D surfaced, and then built C6 (guest extraction discoverability) properly once the user revealed the feature is going into ad campaigns. Ended with a "mention AI everywhere" copy pass.

---

## Commits this session

```
f4e6bbd Add audit findings, session prompt log, and repo-setup notes
238594b Split PLAN.md into active status + PLAN-ARCHIVE.md for completed history
ac938a0 Remove 10 unused skills to cut per-turn token overhead
6d8a25d /handoff: session delta -- audit closeout + C6 discoverability
7238d88 Record C6 discoverability as done in PLAN.md; refresh status
d415b34 Mention AI wherever extraction is mentioned to users
ba17a71 Move the extraction promo to the empty-board state only; animate the demo
744b492 Make screenshot extraction discoverable to guests (C6)
48e7ca1 Record the M6-regression fix in PLAN.md; close it out in status/postponed
5311696 Fix stale pending-signup flag: reopened M6, found during D4
7989052 Refresh the stale Postponed/deferred section to match the closed audit
3245087 Record live confirmation of all D-section fixes (D3, D4, D5, D7)
b818d7c Record Section D closeout in PLAN.md, log the M6-reproduction bug
f2734cb Fix sign-up dead end for an already-registered email (D4)
f20e641 Add a deploy version marker and log failed password checks (D3/D5)
81e97ab Update PLAN.md: correct the false H2 claim, record Section C closeout
d2db730 Add global error handlers, routed through the existing toast (C4)
80e92f2 Add a real contact address to the account-deletion email (C5)
bd014e9 Fix the privacy policy (H2 from AUDIT.md) -- never actually shipped
80160dc Rule out C2 (import/restore): would let users reset the extraction quota
a5b8f86 Resolve D1 (Supabase spend cap): moot on the free plan
```

All pushed (`git log origin/main..HEAD` empty). Nothing stashed, no scratch branches. Working tree fully clean — `AUDIT.md`, `claude-code-prompts.md`, `repo-setup.md` are now committed (`f4e6bbd`), not untracked. Session continued past the first `/handoff` (`6d8a25d`) to also prune 10 unused skills (`ac938a0`) and split `PLAN.md`/`PLAN-ARCHIVE.md` (`238594b`).

---

## Exact stopping point

**Nothing is in progress, stubbed, broken, or half-migrated.** Every commit above is complete, typechecked, linted, tested, pushed, and CI-green. This is a clean boundary.

Test suite is now **39 tests across 6 files, all passing** (was 34 at the start of the C6 work; C6 added 5 in `Board.test.tsx`). `src/components/Board.migration.test.tsx` (the repo's first signed-in test coverage, added by the earlier `5311696` M6 fix) is included in that count.

All Supabase dashboard steps this session required are **done and user-confirmed**: both Edge Functions redeployed for D3/D5 (`f20e641`), and `extract-job-details` redeployed again for the `d415b34` quota-message wording. There are **no outstanding manual steps.**

Files touched by the C6 work, for orientation:
- `src/components/ExtractionPromo.tsx` (new) — guest-only card, rendered at `Board.tsx:574` inside the `!activeTrackerHasApplications` empty-state branch, guarded `{!user && ...}`.
- `src/components/ExtractionDemoAnimation.tsx` (new) — inline animated SVG; keyframes are in `src/index.css` (`extraction-demo-arrow`, `-field-1/2/3`).
- `src/components/ApplicationForm.tsx` — new `onRequestSignUp` prop; guest in-form hint fills the `{!isEdit && !isSignedIn}` slot (~line 182); real button relabeled "Extract with AI".
- `src/components/Board.tsx` — imports/renders `ExtractionPromo`; passes `onRequestSignUp={() => setAuthModalMode('sign-up')}` to `ApplicationForm`.
- `src/components/PrivacyPolicy.tsx` — button-label quote kept in sync with the "Extract with AI" rename.
- `supabase/functions/extract-job-details/index.ts` — 429 quota message reworded to "free AI extractions" (redeployed).

---

## Next action

No queued work. `AUDIT.md` is fully closed, C6 shipped, working tree clean. The next session picks a new milestone or product direction — there is no obvious forced next step. Candidate loose threads, none blocking, are in `PLAN.md` "Postponed / deferred" (notably **D6** — the Anthropic balance/auto-reload decision, still genuinely unmade, worth revisiting once real extraction volume exists).

---

## Learned this session

Durable findings already went into `PLAN.md`'s "Decisions & notes" (H2's process-failure story, the C2→guest-export chain, C4's `window`-identity bug + jsdom `ErrorEvent` trivia, the full C6 design rationale incl. the SVG/reduced-motion pattern and the `aria-label` collision). Not repeated here. What's left that fits nowhere else:

- **The `x-function-version` marker (D3) only works if you bump the constant on every deploy.** It's in `FUNCTION_VERSION` in both functions, ridden out on `CORS_HEADERS`. Forgetting to bump is the *same* failure mode as forgetting to deploy, so it's a cheaper check, not a guarantee. The real one-time drift answer for *this* session was the user's manual dashboard-vs-repo diff (no drift found). Verify a deploy with `curl -sI -X OPTIONS <function-url>` and read `x-function-version`.
- **A live UI check right after a Cloudflare deploy can show a false *negative* from a cached page**, not just the false-positive direction you'd expect. During D4 verification the user first saw the *old* copy; a hard refresh showed the correct new copy. Budget for a hard-refresh step before concluding "the deploy didn't take."
- **D5's rate-limit is almost certainly project-wide, not per-attacker.** The password check runs *inside* the Edge Function, so GoTrue sees the function's own egress IP, and the governing setting ("Rate limit for sign-ups and sign-ins", 30/5min per IP) is therefore shared across every user's password checks. This is recorded in `PLAN.md` but bears repeating: it throttles a sustained guessing attack but a burst of legitimate traffic could also trip it — a genuine tradeoff, not a "turn it up" fix.
- **This environment cannot generate a real GIF/bitmap.** When the user asked for a GIF, the honest answer was an animated SVG instead (better here on every axis, and it's what shipped). Flag this upfront rather than attempting a fake.
- **Live-auth flows still can't be driven end-to-end from inside this environment** (unchanged all session). Everything touching a real Supabase session — the D3/D5 redeploys, the D4 already-registered-email test, the D5 log-line check, the D7 enum query — was handed to the user for live QA and confirmed by them. Plan for that split.

---

## Open questions

- **D6 — Anthropic balance / auto-reload.** The only genuinely open decision. Deferred pending real extraction volume; see `PLAN.md`.
- **C6 effectiveness is unmeasured.** The discoverability work is built and correct, but whether it actually converts ad traffic is an empirical question the code can't answer — worth watching once ads run. No instrumentation exists for it (and C4 added error telemetry, not analytics — there's no event tracking anywhere in the app).
- **Should `AUDIT.md` be committed?** Still untracked by the user's earlier choice. It's load-bearing (commit messages reference its IDs) but survives only on disk, not in a fresh clone. Unchanged from prior handoffs; user hasn't decided.

---

## Verify

```bash
# 1. Typecheck (strict), lint, tests -- expect clean; oxlint prints ONE
#    pre-existing warning about a missing 'handleUndo' dep in Board.tsx
npx tsc -b --noEmit
npx oxlint
npm test                      # expect: 6 files, 39 tests, all passing

# 2. Working tree -- expect clean, nothing untracked
git status --short

# 3. Everything pushed -- expect EMPTY
git log origin/main..HEAD --oneline

# 4. Most recent commit -- expect f4e6bbd (docs), with d415b34
#    "Mention AI wherever extraction is mentioned to users" as the most
#    recent CODE commit further back.
git log --oneline -3

# 5. Run locally
npm run dev
```

- **Production:** https://jobtracker.fazare.dev (Cloudflare auto-deploys every push to `main`).
- **Deployed Edge Functions match repo:** `curl -sI -X OPTIONS https://fjlmyaamarnjlthbhycx.functions.supabase.co/account-action` (and `.../extract-job-details`) should return `x-function-version` matching the `FUNCTION_VERSION` constants in the repo.
- **Already verified, don't redo:** all of section D live (user-confirmed), the C6 empty-state promo + in-form hint + animation + reduced-motion wiring (verified live in the preview browser, guest data restored after), and the "mention AI" copy across promo/hint/privacy page.
