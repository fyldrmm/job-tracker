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

- **Active milestone:** M6 (not started)
- **Last completed:** M5 (Auth + guest→account migration) — fully verified, including live manual QA (signup → email confirm → migration → reload → sign out/in) by the user
- **App runs?** yes — `npm run dev`
- **Next action:** start M6 (GDPR + polish)

---

## Milestones

### M1 — Foundation  *(effort: High)* — ✅ done
- [x] Scaffold frontend (React + Vite + TS + Tailwind, or house stack)
- [x] Create Supabase project; **enable RLS on all tables from the start**
- [x] Define schema: `applications` and `stage_history` (with enums per brief §5)
- [x] Set up IndexedDB local store mirroring the same shape
- [x] App shell runs (empty board placeholder is fine)
- [x] Committed; PLAN.md updated

### M2 — Board + manual entry (local-only, usable)  *(effort: High)* — ✅ done
- [x] Kanban board with 4 columns: Eyes on, Applied, Interview, Offer
- [x] Card front shows company, role title, date applied (only these three)
- [x] Add/edit application form: company*, role*, date applied* (default today), job link, salary, location, notes
- [x] New cards land in the triggering column (default Applied); form also edits existing
- [x] Data persists to the local store; board is fully usable as a guest
- [x] Committed; PLAN.md updated

### M3 — Movement + detail  *(effort: Extra high — dnd is fiddly)* — ✅ done, incl. follow-up fixes
- [x] Drag-and-drop cards between columns (dnd-kit); keyboard-accessible; real mouse-drag confirmed by user
- [x] Moving a card updates `current_stage` and appends a `stage_history` row
- [x] Card detail view (panel/modal) showing all fields, with edit
- [x] Committed; PLAN.md updated
- [x] Bonus (user request): double-click a card advances it to the next stage; triple-click retreats it to the previous stage — trackpad-friendly alternatives to dragging
- [x] Bugfix: dragged card no longer renders under other columns (switched to dnd-kit's `DragOverlay`)
- [x] Bugfix: focus ring on the first card in a column no longer clipped by the column header

### M4 — Archive + undo  *(effort: High)* — ✅ done
- [x] Split-button archive: main button archives with default reason **Rejected**; **▾** opens reasons (Rejected / Withdrawn / No response / Accepted)
- [x] `current_stage` preserved on archive; `is_archived`, `archive_reason`, `archived_at` set
- [x] Separate Archive view listing archived items, with **un-archive**
- [x] Quiet archived count on the board, linking into the Archive view
- [x] Undo toast (~10s) after archiving; **Ctrl/Cmd+Z undoes the last archive** (last-archive only)
- [x] Committed; PLAN.md updated

### M5 — Auth + guest→account migration  *(effort: Extra high — highest-risk, correctness-critical)* — ✅ done, fully verified incl. live manual QA
- [x] Supabase Auth: sign up / log in
- [x] Gentle, **dismissible** account-nudge banner (warns about data loss without an account)
- [x] **Migration:** on account creation by a guest, upload ALL local data into the new account with **zero loss**; idempotent (upsert by primary key + a local "already migrated" flag). Verified both by a mocked-client logic test AND a live signup → email confirm → migration round trip (user-run manual QA, all steps passed: data present after migration, correct `user_id` in Supabase, survives reload, survives sign-out/sign-in)
- [x] After migration, Supabase is source of truth; local store acts as write-through cache (reads fall back to it if offline; no offline-write queue — that's still deferred, see below)
- [x] Verify RLS: a signed-in user can read/write only their own rows — re-confirmed via curl (unaffected by M5, schema unchanged)
- [x] Committed; PLAN.md updated
- *Deferred (do not build): multi-device merge / offline-edit conflict resolution, and (newly scoped down in M5) offline writes — writes require being online while signed in.*

### M6 — GDPR + polish  *(effort: High)*
- [ ] Export all my data as JSON
- [ ] Delete my account (truly deletes all the user's data)
- [ ] Short privacy policy page
- [ ] Empty states for board and columns
- [ ] Optional: subtle "stale" indicator on old cards (in-app only, no notifications)
- [ ] Optional: external donation link (e.g. Ko-fi) in the footer
- [ ] Committed; PLAN.md updated

---

## Out of scope for MVP (do not build; don't design out)

Link auto-parsing · follow-up reminders (email/push) · alternate views (table/list, sorting/filtering) · mobile-first polish · full multi-level undo · real donations integration. See brief §8.

---

## Decisions & notes

*(Claude Code: record anything future sessions should know here — stack choices made, gotchas hit, deviations from the brief and why.)*

- Stack: brief's default followed as-is — React + Vite (v8) + TS + Tailwind v4 (via `@tailwindcss/vite`, no separate config file needed — see `src/index.css`). Package manager: npm.
- Supabase project is live at `https://fjlmyaamarnjlthbhycx.supabase.co`. Schema in `supabase/migrations/0001_init.sql`, applied manually via the dashboard SQL editor (no CLI access token set up yet — the CLI's personal access token lives at supabase.com/dashboard/account/tokens, not the per-project settings, which is why it was hard to find). If a future session needs to push schema changes, either paste the new migration into the SQL editor manually, or get an access token then and use `supabase link` + `supabase db push`.
- `stage_history` has no `user_id` column (matches the brief's data model exactly). Its RLS policies scope through the parent `applications` row's ownership via an `EXISTS` subquery instead of a direct column check.
- Local Supabase credentials live in `.env` (gitignored, confirmed via `git check-ignore`). `.env.example` documents the two required keys with empty values.
- **Key naming note:** this Supabase project uses the newer key format — `sb_publishable_...` (goes in `VITE_SUPABASE_ANON_KEY`, safe client-side because RLS is on) and `sb_secret_...` (service-role equivalent — never put this in any `VITE_`-prefixed var or commit it; it was shared once in chat and should probably be rotated in the dashboard as routine hygiene).
- RLS verified end-to-end via curl against the REST API: unauthenticated reads return `[]` (not an error — RLS filters rows), unauthenticated inserts are rejected with a `42501` row-level-security violation.
- IndexedDB mirror (`src/lib/db.ts`, `src/lib/localStore.ts`) verified with a manual round-trip smoke test in the browser (write + read-back across reloads), then reverted out of `App.tsx` — that test code was temporary, not meant to ship.
- Auth method: **email + password** (decided). Email confirmation is left ON in Supabase (user's choice, safer default) — this means signUp() never returns an active session immediately; migration is triggered from `onAuthStateChange` reporting an active session, not from the signUp call itself. Keep that in mind if this ever needs modifying — the trigger point is intentional, not incidental.
- Hosting: _TBD, decide before M6 / launch._
- **M5 note — data layer architecture:** `useApplications(userId)` now branches on whether `userId` is null (guest → IndexedDB only, unchanged from M1-M4) or set (signed-in → Supabase is primary, mirrored into IndexedDB via `persistApplication`/`persistStageHistoryEntry` write-through helpers in the hook). Reads try Supabase first and fall back to the local cache (filtered by `user_id`) if the request fails — this is genuinely useful offline-read support, not just decoration. Writes do NOT have an offline queue: if you're signed in and offline, a write will throw. That's a deliberate scope cut — full offline-write sync needs conflict resolution, which the brief explicitly defers.
- **M5 note — migration trigger & idempotency:** `migrateGuestDataToAccount(userId)` in `src/lib/migration.ts` reads all local IndexedDB data, stamps `user_id`, and `upsert`s into Supabase (upsert-by-primary-key makes retries safe). It's gated by a `localStorage` flag (`job-tracker:migrated-for-user:<id>`) so it only actually runs once per user per browser, even though the upsert itself would also be safe to repeat. Called from a `useEffect` in `Board.tsx` keyed on `user` — fires whenever a session becomes active and hasn't migrated yet, which correctly covers the "confirmed email in a later browser session" case.
- **M5 note — testing limitation:** I could not complete the live signup → email-confirm → migration test myself in-session. I got surprisingly far — created a real test signup with a `mailinator.com` disposable address, found the confirmation email, and located the confirmation link — but the browser automation tool refused to navigate to `supabase.co` (a newly-encountered external origin) with a hard "denied" error, both via direct navigation and via clicking the link in-page. This appears to be a sandbox restriction on this environment, not something fixable in the app. I instead verified the migration function's correctness by temporarily exposing it on `window` in `main.tsx` (reverted before committing), mocking `supabase.from()` to capture calls without hitting the network, and confirming correct payload shape + idempotency. The user then ran the full live round trip themselves and confirmed it all works — see the M5 checklist item above. If a future session needs to test a live-auth flow, worth knowing upfront that this environment can't drive it end-to-end; plan for user-run manual QA on anything involving a real inbound email.
- **M5 note — custom SMTP configured:** hit Supabase's default email sender rate limit (very low, meant for testing only) while verifying signup. Resolved by setting up custom SMTP via Resend (`smtp.resend.com`, port 465, sender `onboarding@resend.dev` for now since no custom domain is verified yet) under Supabase's **Project Settings → Authentication → SMTP Settings**. This was needed anyway before real launch — Supabase explicitly warns against relying on their built-in sender in production. Worth revisiting before launch: verify a real domain with Resend and use a proper sender address (e.g. `noreply@yourdomain.com`) instead of the shared `resend.dev` test domain.
- M2 note: clicking a card currently opens the edit form directly (not a detail view) — M3 replaces this with the real card detail panel per brief §6.3. Kept the same `ApplicationForm` component for both add and edit (branches on whether `initial` is set) rather than two separate forms.
- M2 note: "Eyes on" quick-action question from brief §10 is still open — no explicit "mark as applied" button yet, drag-and-drop (M3) will be the only way to change stage until/unless we decide to add one.
- Browser-preview tooling note (not a product decision): coordinate-based clicks in the in-app browser tool didn't line up with visual screenshot coordinates during testing; ref-based clicks (from `read_page`) worked correctly. Worth using refs over raw coordinates when verifying UI in future sessions.
- **M3 follow-up (resolved):** user manually confirmed real mouse-drag works, and found three bugs, all now fixed: (1) dragged card rendered under other columns — fixed by rendering the drag preview through dnd-kit's `DragOverlay` (portals to `document.body`, immune to column overflow/stacking) instead of relying on the dragged element's own `transform`; the original card fades to `opacity-30` in place while the overlay copy follows the pointer. (2) Focus ring on the first card in a column was clipped by the column header — the scrollable card list had `px-2 pb-2` with no top padding, so a focused card's ring at the very top had no room before `overflow-y-auto` clipped it; changed to `p-2` (uniform padding fixes it). (3) Added triple-click to retreat a card to the previous stage (`prevStage` in `src/lib/stages.ts`), mirroring double-click's advance.
- M3 note: click disambiguation in `Card.tsx` was reworked from "act immediately on the 2nd click" to a debounce — every click resets a `setTimeout`, and the action only fires once no further click arrives within 250ms, checking the accumulated click count (1/2/3+). This was necessary to add triple-click without it also firing the double-click action first. Tradeoff: double-click now waits the full 250ms after the second click before advancing, rather than firing instantly — not noticeable in practice.
- Tooling note: when testing via the browser automation tool's `javascript_tool`, a DOM query like `el.textContent.includes(X)` can match ancestor elements (e.g. `#root`) that also happen to contain the text — matched too loosely once and dispatched a click on the wrong element. Prefer an exact match (`el.textContent.trim() === X`) on the most specific element, then walk up via `.parentElement` to the actual interactive target. Same trap bit again in M4 testing when a list has multiple structurally-identical rows (Archive view) — `.find()` on a loose `textContent.includes()` predicate can match a shared ancestor container instead of one specific row, and then a nested `querySelectorAll('button').find(...)` grabs the first matching button in the WHOLE container rather than that row's button. When rows repeat, scope the query more tightly (e.g. match on unique text combos, or use `closest()`/index into a specific row element) before querying descendants.
- **M4 bug fixed during testing:** `handleArchive` in `Board.tsx` originally called `archiveApplication(...)` without `await`, then immediately called `setUndoState(...)`. Because `unarchiveApplication` is a `useCallback` keyed on `applications`, and the keydown effect resubscribes only when `undoState` changes, the effect could capture a stale `unarchiveApplication` closure still bound to pre-archive data — `Ctrl/Cmd+Z` would silently no-op even with the undo toast visibly showing. Fixed by awaiting the archive write (and its `applications` refresh) before setting undo state, so the effect's dependent renders always see post-archive data. Worth remembering for any future "fire an async write, then immediately gate a keyboard shortcut on its result" pattern (e.g. if M5's migration ever needs something similar) — await first, or the shortcut can silently do nothing while looking like it should work.
