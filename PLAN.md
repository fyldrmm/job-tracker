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

- **Active milestone:** M4 (not started)
- **Last completed:** M3 (Movement + detail), plus a follow-up bugfix pass — real drag confirmed working by user; fixed z-index (DragOverlay), a clipped focus ring, and added triple-click retreat
- **App runs?** yes — `npm run dev`
- **Next action:** start M4 (Archive + undo)

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

### M4 — Archive + undo  *(effort: High)*
- [ ] Split-button archive: main button archives with default reason **Rejected**; **▾** opens reasons (Rejected / Withdrawn / No response / Accepted)
- [ ] `current_stage` preserved on archive; `is_archived`, `archive_reason`, `archived_at` set
- [ ] Separate Archive view listing archived items, with **un-archive**
- [ ] Quiet archived count on the board, linking into the Archive view
- [ ] Undo toast (~10s) after archiving; **Ctrl/Cmd+Z undoes the last archive** (last-archive only)
- [ ] Committed; PLAN.md updated

### M5 — Auth + guest→account migration  *(effort: Extra high — highest-risk, correctness-critical)*
- [ ] Supabase Auth: sign up / log in
- [ ] Gentle, **dismissible** account-nudge banner (warns about data loss without an account)
- [ ] **Migration:** on account creation by a guest, upload ALL local data into the new account with **zero loss**; make it idempotent and test it hard
- [ ] After migration, Supabase is source of truth; local store acts as cache
- [ ] Verify RLS: a signed-in user can read/write only their own rows
- [ ] Committed; PLAN.md updated
- *Deferred (do not build): multi-device merge / offline-edit conflict resolution.*

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
- Auth method (email+password / magic link / OAuth): _TBD, decide before M5._
- Hosting: _TBD, decide before M6 / launch._
- M2 note: clicking a card currently opens the edit form directly (not a detail view) — M3 replaces this with the real card detail panel per brief §6.3. Kept the same `ApplicationForm` component for both add and edit (branches on whether `initial` is set) rather than two separate forms.
- M2 note: "Eyes on" quick-action question from brief §10 is still open — no explicit "mark as applied" button yet, drag-and-drop (M3) will be the only way to change stage until/unless we decide to add one.
- Browser-preview tooling note (not a product decision): coordinate-based clicks in the in-app browser tool didn't line up with visual screenshot coordinates during testing; ref-based clicks (from `read_page`) worked correctly. Worth using refs over raw coordinates when verifying UI in future sessions.
- **M3 follow-up (resolved):** user manually confirmed real mouse-drag works, and found three bugs, all now fixed: (1) dragged card rendered under other columns — fixed by rendering the drag preview through dnd-kit's `DragOverlay` (portals to `document.body`, immune to column overflow/stacking) instead of relying on the dragged element's own `transform`; the original card fades to `opacity-30` in place while the overlay copy follows the pointer. (2) Focus ring on the first card in a column was clipped by the column header — the scrollable card list had `px-2 pb-2` with no top padding, so a focused card's ring at the very top had no room before `overflow-y-auto` clipped it; changed to `p-2` (uniform padding fixes it). (3) Added triple-click to retreat a card to the previous stage (`prevStage` in `src/lib/stages.ts`), mirroring double-click's advance.
- M3 note: click disambiguation in `Card.tsx` was reworked from "act immediately on the 2nd click" to a debounce — every click resets a `setTimeout`, and the action only fires once no further click arrives within 250ms, checking the accumulated click count (1/2/3+). This was necessary to add triple-click without it also firing the double-click action first. Tradeoff: double-click now waits the full 250ms after the second click before advancing, rather than firing instantly — not noticeable in practice.
- Tooling note: when testing via the browser automation tool's `javascript_tool`, a DOM query like `el.textContent.includes(X)` can match ancestor elements (e.g. `#root`) that also happen to contain the text — matched too loosely once and dispatched a click on the wrong element. Prefer an exact match (`el.textContent.trim() === X`) on the most specific element, then walk up via `.parentElement` to the actual interactive target.
