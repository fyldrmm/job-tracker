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

- **Active milestone:** M1 (not started)
- **Last completed:** none
- **App runs?** not yet
- **Next action:** scaffold the project (see M1)

---

## Milestones

### M1 — Foundation  *(effort: High)*
- [ ] Scaffold frontend (React + Vite + TS + Tailwind, or house stack)
- [ ] Create Supabase project; **enable RLS on all tables from the start**
- [ ] Define schema: `applications` and `stage_history` (with enums per brief §5)
- [ ] Set up IndexedDB local store mirroring the same shape
- [ ] App shell runs (empty board placeholder is fine)
- [ ] Committed; PLAN.md updated

### M2 — Board + manual entry (local-only, usable)  *(effort: High)*
- [ ] Kanban board with 4 columns: Eyes on, Applied, Interview, Offer
- [ ] Card front shows company, role title, date applied (only these three)
- [ ] Add/edit application form: company*, role*, date applied* (default today), job link, salary, location, notes
- [ ] New cards land in the triggering column (default Applied); form also edits existing
- [ ] Data persists to the local store; board is fully usable as a guest
- [ ] Committed; PLAN.md updated

### M3 — Movement + detail  *(effort: Extra high — dnd is fiddly)*
- [ ] Drag-and-drop cards between columns (dnd-kit); keyboard-accessible
- [ ] Moving a card updates `current_stage` and appends a `stage_history` row
- [ ] Card detail view (panel/modal) showing all fields, with edit
- [ ] Committed; PLAN.md updated

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

- Stack: _TBD if house standard differs from the brief's recommendation._
- Auth method (email+password / magic link / OAuth): _TBD._
- Hosting: _TBD._
