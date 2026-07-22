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

- **`AUDIT.md` — fully closed 2026-07-22, by explicit user decision not to be revisited.** Every High/Medium/Low finding, every missing-piece and needs-verification item, is fixed and live-confirmed — including a final `git log --grep` completeness check that resolved two checklist items that *looked* outstanding but were actually stale checkboxes (see "Codebase audit + remediation (AUDIT.md)" in [PLAN-ARCHIVE.md](PLAN-ARCHIVE.md) for the full record, including the D6 Anthropic-balance decision).
- **M9 — Follow-up reminders (push only, no email) — done, live-tested by user in their own browser.** Auto-trigger on time-since-stage-change (14-day threshold, `src/lib/stale.ts`), delivery via the browser `Notification` API while the tab is open/backgrounded (no service worker/VAPID/closed-browser push), on/off toggle (bell icon) in `Sidebar.tsx` requesting OS permission on click, `src/hooks/useStaleReminders.ts` polling every 5 min + on mount with dedup/batching via `src/lib/reminders.ts`. Card badge (front-of-card only, renamed "Stale" → "OUTDATED" per user request) has a per-card dismiss ✕ that suppresses both the badge and the notification for that app until it's genuinely touched again (`dismissStale`/`isDismissedStale` in `src/lib/reminders.ts`). User ran it live via their own `npm run dev` with the threshold temporarily set to 0 for fast iteration, asked for the text rename and the dismiss control mid-session, then had it reverted to 14 — no bug reports came back, but no explicit "confirmed working" statement either, so treat as user-exercised rather than formally signed off. 70 tests passing, `tsc`/`oxlint` clean.
- Prior: All 4 user-proposed features are shipped and live-verified: (4) rename trackers, (3) right-click context menu, (1) most-wanted priority, (2) the browser extension — user loaded it unpacked in a fresh Chrome install and confirmed a real job posting's page pre-filled the add-application form correctly end-to-end.
- **Last completed before M8:** M7 — compulsory name at sign-up, a single Account panel (name/email/password/export/delete/sign-out), and a unified `account-action` Edge Function covering both delete and change-password. Verified live end-to-end by the user on real accounts, including catching and fixing a real bug where changing your password silently revoked your own current session (see "M7 — Account panel + names" below for the full story: a first attempt reverted entirely, rebuilt with each Edge Function action curl-tested standalone, then a second bug found live during QA itself and fixed by removing the risky feature rather than continuing to patch it).
- **App runs?** yes — both locally (`npm run dev`) and live in production
- **Resend domain verified:** user bought `fazare.dev` on Cloudflare, verified it in Resend, and updated Supabase's custom SMTP to send from it — the sandbox "only sends to the account owner's own email" restriction is gone. Confirmed working live (bogus-login test hit Supabase's real Auth API from the deployed site).
- **Session tooling:** `.claude/commands/continue.md` and `.claude/commands/handoff.md` now exist (`/continue` to re-prime a fresh session, `/handoff` to persist state before a `/clear`). Both were generic templates originally written for a `CLAUDE.md`/`architecture.md`/`DECISIONS.md`/`IMPLEMENTATION-PLAN.md` doc structure that doesn't exist in this repo — edited to reference `PLAN.md` and `HANDOFF.md` instead, this project's actual persistent docs. If a future session considers adding those other doc files for real, revisit whether splitting `PLAN.md` up still makes sense at that size, rather than assuming the commands' original structure was right.

---

## Milestones


> **Completed milestones (M1–M7) and all shipped post-MVP work have moved to [PLAN-ARCHIVE.md](PLAN-ARCHIVE.md)** to keep this file light on tokens. One-line index:
>
> - M1 Foundation · M2 Board + manual entry · M3 Movement + detail · M4 Archive + undo · M5 Auth + guest→account migration · M6 GDPR + polish · M7 Account panel + names — all ✅ done
> - Post-MVP done: Multiple named trackers · Archive grouping & sort · Hosting (live at `jobtracker.fazare.dev`) · post-M7 sidebar polish · Permanently delete an application · Four user-proposed features (rename trackers, right-click menu, "most wanted" priority flag, browser extension) · Codebase audit + remediation (`AUDIT.md`, closed — incl. the D6 Anthropic-balance decision)
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

---

## Out of scope for MVP (do not build; don't design out)

Link auto-parsing · follow-up reminders (email/push) · alternate views (table/list, sorting/filtering) · mobile-first polish · full multi-level undo · real donations integration. See brief §8.

**Import/restore (AUDIT.md C2) — ruled out, not deferred.** Flagged in the original audit as "half a safety net" (export exists, nothing reads it back in), but explicitly rejected: the per-account extraction quota (`PER_USER_MONTHLY_LIMIT = 20`, see `src/lib/extraction.ts` and `supabase/functions/extract-job-details/index.ts`) is scoped to `user_id`, not to the underlying person — an import feature would let someone export their board, create a fresh account, import it back, and get another 20 free extractions, repeatably. Don't build this later without also solving that quota-reset vector (e.g. tying limits to something account-creation can't reset), not as a simple follow-up.

---

## Postponed / deferred (not forgotten, just not now)

Things explicitly pushed to later rather than built now or ruled out. Pick any of these up whenever — none are blocking.

### Candidate next milestones (user flagged 2026-07-22)

Follow-up reminders picked and built as M9 above. Two remain, not started:

- **Alternate views** (sortable/filterable table or list, beyond the Kanban board). Brief §8: "Build the board as one *rendering* of the data model so other views are just new renderings, not a refactor" — worth confirming that's still true of the current `Board.tsx`/`useApplications` split before scoping this. The Archive view's existing `MultiSelectFilter` pattern is a likely reusable piece.
- **Mobile-first polish.** Brief §8: "PC-first; keep mobile functional but basic" was the MVP call — this would be the first real investment in that gap. dnd-kit's drag interactions, the sidebar layout, and modal sizing are the areas most likely to need touch-specific work.

- **Unexplained data loss in the `applications` table** — see "Decisions & notes". Investigated and unresolved; test data only, so the user chose to move on.

~~`AUDIT.md`~~ — **fully closed, 2026-07-22** (moved to [PLAN-ARCHIVE.md](PLAN-ARCHIVE.md), see "Current status" above) — not deferred, not to be revisited.
~~D6 — Anthropic account balance / auto-reload decision~~ — **decided, 2026-07-22**: leave as-is; see the "D6 decision" note in PLAN-ARCHIVE.md.
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
