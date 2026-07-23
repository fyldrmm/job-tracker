# HANDOFF.md — Job Application Tracker

**Purpose:** Everything the next session needs to continue with zero re-explanation. Read this together with `PLAN.md` (the long-lived source of truth) and `job-tracker-mvp-brief.md` (original spec) — or just run `/continue`, which reads all three in the right order.

---

## Session scope

Built M13 — Interview scheduling + calendar export — end to end across 6 planned stages plus a follow-up entitlement-seam fix, all in one session. Full technical write-up lives in `PLAN-ARCHIVE.md` (search "M13"); this file covers only what a person can't reconstruct from the diff. Session ended on a live guest→signup migration test (user's explicit ask) that surfaced an unresolved, low-confidence bug signal — see "Open questions" below.

## Commits this session

All pushed to `origin/main`, in order:

- `5154f3a` — Add interview scheduling with calendar export (M13) — stages 1–5: `interviews` table/migration, `useInterviews` hook, `.ics`/Google Calendar export, the post-move scheduling-prompt queue, CardDetail's Interviews section (add/edit/delete rounds), the Kanban card badge, Table/CSV/XLSX columns
- `ad14c27` — Carry interviews through JSON export and guest→account migration — stage 6
- `5a600e2` — Add the paid-tier entitlement seam for interview scheduling, close out M13 — `src/lib/entitlements.ts` (`canScheduleInterviews()`, stubbed `true`), wired into `Board.tsx` and `CardDetail.tsx`; PLAN.md/PLAN-ARCHIVE.md updated in the same commit

Nothing stashed, nothing on a scratch branch. `git status` is clean.

## Exact stopping point

Nothing in progress, nothing broken, nothing half-done in the codebase. Working tree is clean and matches `origin/main` exactly. All 6 planned stages of M13 are built, tested, and live-verified in the browser preview; the entitlement seam (originally planned item #6, initially missed across stages 1–6, caught and fixed before session end) is also in.

The one loose end is **not in the code** — it's an open question about a live migration test, detailed under "Open questions" below. No file is stubbed, broken, or mid-edit because of it.

`supabase/migrations/0013_interviews.sql` has already been run by the user against the live Supabase project (confirmed, before the migration test below).

## Next action

No committed next step — M13 is done and the user has not named the next milestone. Two live options on the table from this session, neither started:

1. **Chase the migration-race signal** (see "Open questions") — reproduce a fresh signup with the browser's network-request log captured from the very first request, to catch the actual server error the first automatic migration attempt threw. Only worth doing if the user wants confidence before this ships to real users signing up with real guest data.
2. **Clean up the leftover Supabase test account** `jaliba2323@barumart.com` (3 trackers, no applications, created during the migration test) — user's own dashboard action, not blocking anything.

Otherwise: wait for the user to name what's next. `PLAN.md`'s "Postponed / deferred" section has no other open items beyond the two above.

## Learned this session

- **Claude cannot create accounts or enter credentials, full stop — not even for a disposable temp-mail test account the user explicitly authorizes in the moment.** This came up directly: the user asked Claude to test the guest→signup flow live using a temp-mail address, and Claude had to decline the account-creation and login steps specifically while still being able to observe/verify state via the browser console before and after. Worth remembering the exact split next time this comes up: Claude can open the sign-up form, verify pre/post state via `javascript_tool` (session checks, IndexedDB reads, direct Supabase queries once authenticated), and even re-invoke app functions like `migrateGuestDataToAccount()` directly from the console — but cannot type credentials into a form or click the account-creating submit button itself, regardless of how low-stakes the account is.
- **`clearLocalStore()` firing on an unexpected/silent sign-out wiped all local guest test fixtures mid-investigation.** While investigating the migration-test failure, the browser's Supabase session silently expired/signed out between two console calls (exact trigger unconfirmed — possibly a token-refresh edge case, possibly something in how a mid-session dynamic `import()` of `supabase.ts` interacts with Vite HMR's module state). This correctly triggered the app's own `clearLocalStore()` (by design, so a shared device never leaks one account's cached data into guest mode) — which meant all 9 guest applications / 3 trackers / 2 interview rounds used for every prior stage's live verification vanished from that browser. No real data was lost (all of it was disposable test fixtures created during this session), but it's worth remembering that this app's sign-out behavior is aggressive by design, and a console-driven test session can trigger it unexpectedly if the auth session isn't as stable as it looks.
- **Browser console `read_console_messages` output can be stale/buffered across a long session** — several times this session, errors that looked like live regressions (a `Cannot read properties of undefined (reading 'filter')` in `Column.tsx`, specifically) turned out to be buffered from a transient mid-edit HMR moment tens of minutes earlier, identifiable by the stale `?t=<timestamp>` query string Vite appends to hot-reloaded module URLs. The reliable check is always: open a brand-new tab (`tabs_create` + `navigate`) and read its console fresh — never trust `read_console_messages` on a tab that's been open through multiple edits without cross-checking timestamps first.
- **`read_network_requests`' log rotates/clears over a long session** — by the time the migration-test failure was being investigated, the network request that would have shown the actual Supabase error response for the failed application-upload upsert had already fallen out of the buffer. If a live-testing session needs to capture a specific network error, check the log immediately after the failure, not minutes later once other investigation has happened in between.

## Open questions

**The live guest→signup migration test found a real, unconfirmed bug signal.** Sequence: real signup via temp-mail (user-performed) → automatic post-signup migration fired and failed on its first attempt (the app's own real error toast: "We couldn't finish syncing your guest data") → a bare manual retry of `migrateGuestDataToAccount()` from the console, with zero code changes, succeeded immediately. Trackers had migrated correctly on the very first attempt (3-for-3, confirmed directly against Supabase); applications had not. Root cause is **unconfirmed** — the leading theory is a race condition on the very first Supabase request right after the email-confirmation redirect (session not yet fully hydrated), not a logic bug in `migration.ts` itself, since that code is unit-tested (`migration.test.ts`) and was independently verified working via the guest-mode `buildExportData()` path. This needs a decision: is it worth reproducing cleanly (fresh signup, network log captured from the very start) to pin down, or is it low-enough-stakes to leave as a known soft spot? Full detail in `PLAN-ARCHIVE.md`'s M13 entry under "Live guest→signup migration test."

No other open questions. Nothing else was deferred mid-decision this session.

## Verify

```bash
git status --short
# expect: nothing (clean tree, matches origin/main)

git log --oneline -3
# expect (top to bottom):
# 5a600e2 Add the paid-tier entitlement seam for interview scheduling, close out M13
# ad14c27 Carry interviews through JSON export and guest→account migration
# 5154f3a Add interview scheduling with calendar export (M13)

npm test
# expect: Test Files 24 passed (24), Tests 180 passed (180)

npx tsc -b --noEmit
# expect: no errors

npx oxlint
# expect: exactly one warning, pre-existing and unrelated to this session --
# src/components/Board.tsx:403:11 react-hooks(exhaustive-deps) re: handleUndo.
# Do not assume a fresh session introduced this; it predates M13.
```

To see the shipped work live: open the app, move any card into the Interview column (drag, double-click to advance, or the column's own "+") and confirm the scheduling prompt appears; open a card already in Interview and confirm its "Interviews" section shows `.ics`/Google/Edit/Delete per round plus "+ Add round"; check that a card with an upcoming interview shows an `R{n} · {date}` badge on the board and matching "Next interview"/"Rounds" columns in Table view.
