# PLAN.md — Job Application Tracker (MVP)

This file is the project's memory across Claude Code sessions. Claude Code has no memory between sessions, so **this file + git history are the source of truth for progress.** Read it at the start of every session; update it as you go.

Full spec: see `job-tracker-mvp-brief.md` in the repo root.

---

## Working protocol (read every session)

1. **Read `job-tracker-mvp-brief.md` and this file first**, then inspect the current state of the code before doing anything.
2. **Do exactly one milestone per session.** Complete only the milestone named in the prompt. Do **not** start the next milestone — stop when the current one is done and the app runs.
3. **Plan before executing.** Produce an execution plan for the milestone and wait for the user's approval before writing code.
4. **Commit after every working sub-step** with a clear message. Small, frequent commits mean an interrupted session loses only the uncommitted tail.
5. **Update this file as you go** — check off completed items and keep the "Current status" section accurate. The next session depends on it.
6. **End each milestone in a runnable, committed state.** The app should launch and the milestone's slice should work before you stop.
7. If you hit a blocker or make a decision worth remembering, note it under "Decisions & notes" below.

---

## Current status

- **Active milestone:** Audit remediation is **done, for real this time.** A full read-only audit produced `AUDIT.md` (untracked, on disk at repo root) listing 4 High / 8 Medium / 11 Low findings plus missing pieces. **Correction, 2026-07-21:** this line previously claimed "every High (H1–H4)" was shipped and live-verified — **that was false.** H2 (privacy policy accuracy) was never actually done; `git log -- src/components/PrivacyPolicy.tsx` had exactly one commit, the file's original creation in M6, predating the audit entirely. No commit ever referenced H2. It sat unnoticed through three full remediation batches because findings were tracked by grepping commit messages for IDs, and nobody ran the cheap check of confirming every ID in `AUDIT.md` section B actually had one. **Process lesson: "does every finding ID appear in `git log --grep`" is a five-second completeness check — run it before declaring a section done, not after a later session stumbles onto the gap.** H2 is now actually fixed (`bd014e9`) — see the H2 note below for exactly what was wrong and what changed. With that: every High (H1–H4), all 8 Mediums (M1–M8), all 11 Lows, and password reset (C1) are shipped and live. Batches: 1 — M1, M3, M4, M7 (`9d4d684`); 2 — M2, atomic extraction quota (`7fb4ca8`, migration run + redeployed + live-verified); 3 — M5, revoke all sessions on password change (`693ada3`, redeployed + curl-tested + live-verified, including confirming a second open session died immediately on password change, not just on its next refresh — see the M5 note below). The `delete-account` Edge Function has also been undeployed.
- **Section C (missing pieces): all six now done, including C6.** C1 (password reset) and C3 (tests + CI) done pre-session. **C2 (import/restore) ruled out** — see "Out of scope for MVP" above. **H2, C5 (support channel), and the guest-export policy correction shipped together** (`bd014e9`) — privacy page now accurately describes the required name, AI extraction, and a "Who else is involved" list, plus a `fazare@fazare.dev` contact section/footer link, plus corrected wording since guests can't actually reach Export. The account-deletion email also got the same contact address (`80e92f2`, redeployed and live). **C4 (error telemetry) shipped** (`d2db730`) — global `window` error/rejection handlers routed into the existing toast, local-only by design. **C6 (guest extraction discoverability) — initially deferred this session, then built later the same session** (`744b492`, `ba17a71`, `d415b34`) once the user clarified the feature is going into ad campaigns, which changed the priority. Full detail in "Decisions & notes" below under "C6 — extraction discoverability."
- **Section D (needs-verification): all seven resolved and live-confirmed by the user, 2026-07-21.** D1 (spend cap, moot on the free plan), D2 (key rotated), D6 (Anthropic balance) were already done. **D3 (deploy drift)** — both Edge Functions redeployed and confirmed via `curl -sI -X OPTIONS` matching `x-function-version` for both; the user also manually diffed the dashboard's prior code against the repo before redeploying (no drift found at that point). **D4 (sign-up dead end)** — confirmed live: an already-registered email now shows the conditional copy and a working "Log in instead" button (initially looked stale from a cached page load; a hard refresh showed the real, correct result — worth remembering that a live check right after a Cloudflare deploy can show a false negative from cache, not just a false positive), and — importantly, this was the one fact the whole fix rested on and hadn't actually been verified before — **no email arrives** for an already-registered address, confirming Supabase's anti-enumeration returns silent success rather than erroring. **D5 (rate-limit visibility)** — the log line (`user.id` + `action`, no password/email) confirmed appearing in `account-action`'s logs on a real failed attempt; the actual dashboard setting is **"Rate limit for sign-ups and sign-ins": 30 requests/5 min per IP (360/hour)** — this is the one that gates `signInWithPassword`, distinct from the adjacent "token refreshes" and "token verifications" (OTP/magic-link) rows, which don't apply here. Confirms the D5 note below: since the check runs *inside* the Edge Function, that "per IP" budget is almost certainly shared across every user's password checks project-wide (the function's own egress IP), not scoped per attacker — so it throttles a sustained guess but a burst of legitimate traffic could also trip it. **D7 (`internship` enum in prod)** — confirmed via `select enum_range(null::employment_type);`, `internship` present alongside the other three values.
- **M6-regression bug (stale pending-signup flag) — fixed, same day, commit `5311696`.** Found while investigating D4, initially deferred by explicit user choice to keep that batch scoped to verification, then fixed immediately after in its own planned session. `markPendingSignup`/`consumePendingSignup` now validate `{email, at}` against the arriving session's email + `created_at` instead of trusting a bare flag, and the flag is always consumed on session arrival rather than only when guest data exists. Full detail in "Decisions & notes" below. Includes the repo's first signed-in test coverage (`src/components/Board.migration.test.tsx`, 3 new tests) plus 8 new unit tests in `migration.test.ts` — suite is now 34 tests, all passing, and the fix was also manually verified against the real shipped module live in the browser.
- **Next action:** mid-way through 4 user-proposed features (see "Four user-proposed features" below). (4) rename trackers was already shipped pre-existing. (3) right-click context menu just shipped (`a6b3c16`). Next up: (1) manual "most wanted" priority flag + accent color, then (2) the browser extension (its own multi-session milestone).
- **Last completed before M8:** M7 — compulsory name at sign-up, a single Account panel (name/email/password/export/delete/sign-out), and a unified `account-action` Edge Function covering both delete and change-password. Verified live end-to-end by the user on real accounts, including catching and fixing a real bug where changing your password silently revoked your own current session (see "M7 — Account panel + names" below for the full story: a first attempt reverted entirely, rebuilt with each Edge Function action curl-tested standalone, then a second bug found live during QA itself and fixed by removing the risky feature rather than continuing to patch it).
- **App runs?** yes — both locally (`npm run dev`) and live in production
- **Resend domain verified:** user bought `fazare.dev` on Cloudflare, verified it in Resend, and updated Supabase's custom SMTP to send from it — the sandbox "only sends to the account owner's own email" restriction is gone. Confirmed working live (bogus-login test hit Supabase's real Auth API from the deployed site).
- **Session tooling:** `.claude/commands/continue.md` and `.claude/commands/handoff.md` now exist (`/continue` to re-prime a fresh session, `/handoff` to persist state before a `/clear`). Both were generic templates originally written for a `CLAUDE.md`/`architecture.md`/`DECISIONS.md`/`IMPLEMENTATION-PLAN.md` doc structure that doesn't exist in this repo — edited to reference `PLAN.md` and `HANDOFF.md` instead, this project's actual persistent docs. If a future session considers adding those other doc files for real, revisit whether splitting `PLAN.md` up still makes sense at that size, rather than assuming the commands' original structure was right.

---

## Milestones


> **Completed milestones (M1–M7) and all shipped post-MVP work have moved to [PLAN-ARCHIVE.md](PLAN-ARCHIVE.md)** to keep this file light on tokens. One-line index:
>
> - M1 Foundation · M2 Board + manual entry · M3 Movement + detail · M4 Archive + undo · M5 Auth + guest→account migration · M6 GDPR + polish · M7 Account panel + names — all ✅ done
> - Post-MVP done: Multiple named trackers · Archive grouping & sort · Hosting (live at `jobtracker.fazare.dev`) · post-M7 sidebar polish
>
> Full checklists, bugs, and QA notes for those live in the archive. Recent/active milestones stay below.


### M8 — AI job extraction from a screenshot  *(user request)* — ✅ done, live, and verified end-to-end

**Flow:** on the add-application form, a signed-in user clicks "Extract from screenshot," picks an image, and Claude Haiku 4.5 pre-fills company/role/salary/location/link/employment-type/work-mode for the user to review and save. Free but spend-capped (20 extractions/user/month, 5,000/month global ceiling, calendar-month reset) so usage can't produce a surprise bill.

- [x] `supabase/functions/extract-job-details/index.ts` — signed-in-only Edge Function; checks the per-user and global monthly quota BEFORE calling Anthropic (the wallet protection); calls Haiku 4.5 with the image + `output_config.format` structured-output JSON schema; records one `extraction_events` row per successful call. Curl-verified standalone (real extraction, invalid input, simulated over-quota) before any UI touched it, same discipline as M7.
- [x] `supabase/migrations/0004_extractions.sql` — `extraction_events(user_id, created_at)`, RLS scoped to `select` own rows only.
- [x] Token-spend caps added after real usage data (~1,093 in / 82 out ≈ $0.0015/extraction, cheaper than the original estimate): reject images over 5MB decoded before any Anthropic call; `max_tokens` 1024 → 500.
- [x] `extractJobDetails()` in `src/lib/remoteStore.ts`, reusing a shared `invokeEdgeFunction` helper (refactored out of the existing `callAccountAction` for the same error.context-extraction pattern).
- [x] "Extract from screenshot" button in `ApplicationForm.tsx` (add-mode + signed-in only — hidden entirely for guests and when editing), with client-side type/size validation mirroring the server's 5MB cap, a loading state, and auto-fill on success.
- [x] User-run live QA on the core extraction flow: passed (button appears when signed in, extracts correctly, re-usable, rejects non-images client-side).

#### Follow-ups from that QA round — all built and verified live

- [x] **Notes no longer auto-fills from extraction** — removed from the Edge Function's schema entirely (the user wants Notes reserved for their own free-form ideas, not AI output) and from the client auto-fill.
- [x] **Employment type / work mode** — new nullable `employment_type` (`full_time`/`part_time`/`freelance`, later joined by `internship` via `0006_internship_employment_type.sql`) and `work_mode` (`on_site`/`remote`/`hybrid`) columns (`0005_employment_work_mode.sql`, same enum-naming pattern as `archive_reason`), form dropdowns in `ApplicationForm.tsx`, display in `CardDetail.tsx`, and both are now part of the AI extraction schema too. Labels centralized in `src/lib/employment.ts` (shared between the form and card detail, same pattern as `src/lib/archive.ts`). Adding a new enum value later is a Postgres `alter type ... add value` migration, not a column change — worth remembering as the pattern for any future employment_type/work_mode/archive_reason/application_stage addition.
- [x] **Employment type / work mode filter UI in the Archive view** *(follow-on, user request)* — extracted a generic `MultiSelectFilter<T>` component (`src/components/MultiSelectFilter.tsx`) from what used to be the Archive view's one-off `ReasonFilter`, then used it for three filters: Reasons (existing, now using the generic component), Employment, Work mode. Scope deliberately limited to the Archive view, matching the existing "Reasons (n)" precedent — the main board has no filter concept at all and adding one there was explicitly ruled out for this pass. Applications with no value for a given field are unaffected by that field's filter (shown regardless), rather than requiring an explicit "not specified" option. Accessibility pass (`web-design-guidelines` skill) added `aria-expanded`/`aria-haspopup` and Escape-to-close-with-focus-return to the shared component — gaps that existed in the original `ReasonFilter` too, fixed once here since three instances were about to ship instead of one. Verified live: filtering narrows correctly, panel toggle/Escape/focus-return all work, `aria-expanded` reflects state.
- [x] **Separate "Log in" sidebar button for guests** — reverses the M7-era decision that login should only be reachable via the toggle inside the Sign-up modal (see the post-M7 sidebar polish note above). Used an icon (`LoginIcon`) that was already defined in `icons.tsx` but unused.

#### Bug found and fixed during the QA round: structured-output schema rejected by Anthropic

First redeploy of the employment_type/work_mode extraction returned a generic "Extraction failed" (the function's deliberately-generic client-facing message for any non-2xx from Anthropic). Root cause: the schema expressed a nullable enum as `{ type: ['string', 'null'], enum: ['full_time', ..., null] }` — valid JSON Schema, but not a construct Anthropic's structured-output validator accepted, unlike the plain `type: ['string', 'null']` (no `enum`) used successfully by the original six fields. Fixed by switching to the documented-safe `anyOf` pattern: `{ anyOf: [{ type: 'string', enum: [...] }, { type: 'null' }] }`. Confirmed working after redeploy — worth remembering as a general pattern if a future field ever needs a nullable enum in a structured-output schema.

#### Manual steps + QA checklist for M8 — all done

1. ~~Run `supabase/migrations/0005_employment_work_mode.sql`~~ — done.
2. ~~Redeploy `extract-job-details`~~ — done, twice (once for the initial schema change, once for the `anyOf` fix above).
3. ~~Live QA of all three follow-ups~~ — done, all confirmed: dropdowns persist through a real Supabase round-trip (verified via the Table Editor too), "Not specified" round-trips as `null`, a fresh extraction leaves Notes empty and correctly fills employment type/work mode when the screenshot states them, and the new "Log in" sidebar button opens the modal directly in log-in mode.
4. Committed; PLAN.md updated.

### Post-M8 — Permanently delete an application  *(user request — real gap found: archive/un-archive existed, but nothing ever permanently removed an application)* — ✅ done, verified live signed-in

- [x] `deleteApplication(id)` threaded through the stack: `localStore.ts` already had a working, fully-unused `deleteApplication` (cascades to `stage_history` in the same IndexedDB transaction) — just needed wiring up. Added `deleteRemoteApplication` to `remoteStore.ts` (cascades via the existing FK, no new migration needed) and a `deleteApplication` callback in `useApplications.ts` that calls both when signed in.
- [x] ~~Scope deliberately limited to archived applications only~~ — **reversed after the user's live QA**: requiring "archive first, then delete" was too much friction for a genuine unwanted entry. `CardDetail.tsx` now shows the same small trash-icon delete button for active (non-archived) applications too, alongside the Archive split-button, not just for archived ones. `useApplications.ts`'s `deleteApplication` was never actually gated on `is_archived` in the first place, so this was a pure UI change — no data-layer edit needed.
- [x] Two entry points, both user-specified: a small trash-icon button directly on each Archive row (`TrashIcon` — already defined in `icons.tsx`, unused until now, same as `LoginIcon` before it), and a full "Delete" button in `CardDetail.tsx`'s action row when `application.is_archived` (replacing the `ArchiveSplitButton` slot, which only shows for non-archived applications).
- [x] `DeleteApplicationModal.tsx` — one-click confirm (not type-to-confirm), matching the "empty tracker" tier of `DeleteTrackerModal`'s existing precedent rather than the stricter account/non-empty-tracker tier, since one application is much lower stakes.
- [x] Verified in-browser (guest/local IndexedDB): both entry points open the confirm modal, Cancel/Delete both work, deleting from `CardDetail` correctly closes both the confirm modal and the detail modal, deleted rows are actually gone from IndexedDB (confirmed via reload/re-render), no console errors.
- [x] **Signed-in QA — done.** User confirmed the delete row disappears from the `applications` table (and `stage_history` cascades) in the Table Editor.

### Four user-proposed features — in progress

User pitched 4 ideas: (1) dynamic card color for "most wanted" applications, (2) a browser extension to pull job details from a page, (3) right-click for fast card actions, (4) rename trackers. **(4) was already shipped** (double-click a tracker tab, `TrackerTabs.tsx`/`useTrackers.ts`) — nothing to build. Agreed direction for the rest: (1) is a **manual** flag the user sets (not computed), a subtle accent, not a full recolor; (2) the extension scrapes page text and hands off to the **existing add-form for review** (no auto-save, no extension-side auth) via a new text-based Claude structured-extraction Edge Function, reusing the `extract-job-details` quota/schema plumbing — this is the brief's §8 "link auto-parsing, design for later" arriving via a different capture method. Order: (3) → (1) → (2), since (2) is a second codebase and its own multi-session milestone.

- [x] **(3) Right-click context menu for fast actions** (`a6b3c16`). New `ContextMenu.tsx`, opened by right-click on a card OR a new kebab (⋮) button (the keyboard/touch-reachable trigger, so the menu isn't a mouse-only path to Archive/Delete). Items: Open, move to adjacent stage, Open job link (if present and `isSafeHttpUrl`), Archive (default reason), Delete (routes through the existing confirm modal, not instant). Found and fixed a real bug during manual browser verification: the menu renders inside `Card`'s own DOM subtree (just repositioned via `position: fixed`, not a portal), so a menu-item click without `stopPropagation` bubbled to the card's own `onClick` and silently reopened the detail view ~250ms later (the click-count debounce read it as a bare single click). Fixed with `event.stopPropagation()` in `ContextMenu`'s item handler; added a regression test (`Board.test.tsx`, "Board card context menu" describe block, 3 new tests — suite now 42). Verified live in the preview browser: right-click and kebab-click both open the menu, stage-move works and persists, Escape closes without side effects, Delete opens the confirm modal rather than deleting immediately.
- [ ] **(1) Manual "most wanted" priority flag + accent color** — not started.
- [ ] **(2) Browser extension for job-detail extraction** — not started.

### Codebase audit + remediation  *(user request — one-off deep audit, then fix findings in severity order)* — in progress

A read-only audit of the whole repo produced **`AUDIT.md`** at the repo root (deliberately untracked — it's a working report, not shipped code; it's on disk and survives `/clear`). It contains: executive summary, a findings table (4 High / 8 Medium / 11 Low, each with file:line + suggested fix direction), missing pieces, a "needs verification" list of dashboard-only questions, and a recommended order of work. **Read `AUDIT.md` for finding details rather than restating them here.**

Findings are referenced by ID (H1, M3, L7…) in commit messages, so `git log` maps cleanly onto the audit.

- [x] **C1 — password reset** (`d7fdc2a`). `resetPassword` / `updatePasswordAfterRecovery` in `useAuth.ts`, a "Forgot password?" sub-view in `AuthModal.tsx`, and `SetNewPasswordModal.tsx` shown when `PASSWORD_RECOVERY` fires. Verified live end-to-end by the user, including rejection of password reuse. Required allow-listing the redirect URL in Supabase → Authentication → URL Configuration.
- [x] **H1 + M6 — guest-migration timing** (`b4f5a4b`). See "Decisions & notes" for the design change; both bugs shared one root cause.
- [x] **H3 + M8 — silent write failures + no error boundary** (`d9167a6`). `ErrorToast.tsx` + a `showError()` helper in `Board.tsx` now wired into every previously fire-and-forget handler; `moveApplicationStage` reverts its optimistic update on failure; `ApplicationForm` surfaces submit errors inline; `ErrorBoundary.tsx` wraps `<App />`.
- [x] **H4 + C3 — tests and CI** (`ee1d344`). See "Decisions & notes" for tooling choices and the Node webstorage gotcha.
- [x] **L1–L11 — all Low findings** (`06e0352`). Includes `strict: true`, dead-code removal (incl. deleting the superseded `delete-account` Edge Function from the repo), `isSafeHttpUrl` link hardening, `useModalDismiss`, local-cache eviction, and the extraction usage counter.
- [x] **Token usage tracking** *(user request, not an audit finding)* (`6b21841`). `0007_extraction_token_usage.sql` adds nullable `input_tokens`/`output_tokens` to `extraction_events`, populated from the Anthropic response's `usage` field. First real measurement: **2122 in / 64 out** — note this is ~2x the input of the ~1093/82 measured back in M8, possibly because the extraction schema grew (employment_type/work_mode), possibly just a larger screenshot. User plans to run ~20 back-to-back extractions to get a real average before setting a budget.
- [ ] **M1, M2, M3, M4, M5, M7 — remaining Mediums.** Approved 3-batch plan at `/Users/burak2/.claude/plans/let-s-get-all-the-joyful-deer.md`. Batch 1 (M1/M3/M4/M7, client-only) is the next action.
- [ ] **C2, C4, C5 — remaining missing pieces.** Import/restore for the JSON export; error telemetry; a support/contact channel (the deletion email says "contact us" and there is no contact method anywhere).

---

## Out of scope for MVP (do not build; don't design out)

Link auto-parsing · follow-up reminders (email/push) · alternate views (table/list, sorting/filtering) · mobile-first polish · full multi-level undo · real donations integration. See brief §8.

**Import/restore (AUDIT.md C2) — ruled out, not deferred.** Flagged in the original audit as "half a safety net" (export exists, nothing reads it back in), but explicitly rejected: the per-account extraction quota (`PER_USER_MONTHLY_LIMIT = 20`, see `src/lib/extraction.ts` and `supabase/functions/extract-job-details/index.ts`) is scoped to `user_id`, not to the underlying person — an import feature would let someone export their board, create a fresh account, import it back, and get another 20 free extractions, repeatably. Don't build this later without also solving that quota-reset vector (e.g. tying limits to something account-creation can't reset), not as a simple follow-up.

---

## Postponed / deferred (not forgotten, just not now)

Things explicitly pushed to later rather than built now or ruled out. Pick any of these up whenever — none are blocking.

- **`AUDIT.md` — closed, 2026-07-21.** Every finding across sections A/B/C/D is fixed and, where it required a live check, live-confirmed. C2 (import/restore) is ruled out permanently, not deferred — see "Out of scope" above. C6 is also done now (see "Decisions & notes"), not deferred — nothing from the audit itself remains open.
- **D6 — Anthropic account balance / auto-reload decision.** Not part of this session's D-section closeout (D6 was already marked resolved by an earlier session on the grounds that token tracking now exists to inform the decision) — but the decision itself (raise the balance? turn on auto-reload? at what limit?) still hasn't actually been made. Worth revisiting once real extraction volume exists to base it on.
- **Unexplained data loss in the `applications` table** — see "Decisions & notes". Investigated and unresolved; test data only, so the user chose to move on.

~~Employment type / work mode filter UI~~ — **done**, see "M8 — AI job extraction from a screenshot" below.
~~Hosting~~ — **done**, see "Post-MVP — Hosting" below.
~~Deletion-confirmation email~~ — **done**, folded into M7's unified `account-action` function — see "M7 — Account panel + names" below.
~~Old Supabase Auth accounts from testing~~ — **done**, user deleted both leftover accounts (the real secondary email and an old test signup) directly from the Supabase dashboard, then deleted and recreated the primary account too as part of M7's live QA — the only account now is the fresh one with a name set.
~~Show which tracker an archived application belongs to, inside `CardDetail.tsx`~~ — **done**, see "Post-MVP — Archive grouping & sort" below.
~~Real Ko-fi/donation flow verification~~ — **done**, user clicked through and confirmed it leads to the correct page.

---

## Decisions & notes

The full decisions-and-gotchas log — stack choices, Supabase project/key facts, data-layer architecture, the guest-migration-trigger redesign, testing tooling, Edge Function deploy-sync rules, and every per-milestone bug post-mortem — lives in **[PLAN-ARCHIVE.md](PLAN-ARCHIVE.md)**. It is historical reference: read the specific entry there when a task touches that area, rather than loading all of it every session.

Record new decisions from the *current* active milestone here first; fold them into the archive at the next `/handoff` once that milestone is done.
