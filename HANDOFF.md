# HANDOFF.md — Job Application Tracker

**Purpose:** Everything the next session needs to continue with zero re-explanation. Read this together with `PLAN.md` (the long-lived source of truth) and `job-tracker-mvp-brief.md` (original spec) — or just run `/continue`, which reads all three in the right order.

---

## Session scope

Built and shipped M10: a new sortable/filterable Table view alongside the Kanban board, per the user-approved plan from `PLAN.md`'s "Candidate next milestones."

---

## Commits this session

```
75ece18 Add M10: sortable/filterable Table view alongside the Kanban board
```

Pushed to `origin/main` (`git log origin/main..HEAD` empty, confirmed after push). Nothing stashed, no scratch branches. Working tree clean.

---

## Exact stopping point

**Nothing is in progress, stubbed, broken, or half-migrated.** M10 is complete, typechecked (`npx tsc -b --noEmit`, clean), linted (`npx oxlint`, one pre-existing warning only — see Verify below), tested (75/75 passing, up from 70 — 5 new tests in `src/lib/tableView.test.ts`), pushed, and I verified it live in this session's own browser preview (not handed off to the user this time — see "Learned this session"). This is a clean boundary with no queued work.

No Supabase manual steps needed — M10 is entirely client-side (new component + one pure sort helper), no schema changes, no Edge Function changes.

Files/dirs touched this session, for orientation:
- `src/lib/tableView.ts` (new) — `TableSortKey`/`SortDirection` types and `sortApplicationsForTable()`, a pure function so sort logic (including "stage sorts by pipeline order via `STAGE_ORDER.indexOf`, not alphabetically") is unit-testable without rendering the component.
- `src/lib/tableView.test.ts` (new) — 5 tests: company asc/desc, date_applied asc, stage-by-pipeline-order, and a no-mutation check on the input array.
- `src/components/TableView.tsx` (new) — the table itself. Columns: priority star, Company (+ notes icon), Role, Stage (a `<select>` writing through `onStageChange`), Date applied, Salary, Location, Employment, Work mode. Click a column header to sort by it (toggles asc/desc on repeat click). Three `MultiSelectFilter` instances (Stage/Employment/Work mode) reusing the exact component `ArchiveView.tsx` already uses, including its "don't let the last selection disappear" `toggleSetValue` helper (duplicated here, not extracted — see "Learned this session"). Row click opens `CardDetail` via `onCardOpen`.
- `src/components/icons.tsx` — new `ListIcon` (simple list/table glyph) for the sidebar nav item.
- `src/components/Sidebar.tsx` — `view`/`onNavigate` prop types extended to include `'table'`; new `NavItem` for "Table" inserted between "Job Tracker" and "Archived".
- `src/components/Board.tsx` — `View` type extended to `'board' | 'archive' | 'table' | 'privacy'`; new `activeApplications` memo (non-archived, scoped to `activeTrackerId` — same scope as `byStage`, just flat instead of grouped); new `handleStageChange()` handler (thin wrapper around the existing `moveApplicationStage`, same error-toast pattern as `handleCardAdvance`/`handleCardRetreat`); render branch for `view === 'table'` inserted between the "nothing here yet" empty state and the board's `<main>` (so both share the same "create a tracker" / "no applications yet" empty states); `pageTitle`, the tracker-tabs visibility condition, and the "+ Add application" button visibility condition all extended from `view === 'board'` to `view === 'board' || view === 'table'`.
- `PLAN.md` — new M10 entry in "Current status" (full detail there, not repeated here); "Candidate next milestones" trimmed to the 1 remaining (mobile-first polish).

---

## Next action

No user-agreed next task. The only remaining item in `PLAN.md`'s "Candidate next milestones" is **mobile-first polish** (brief §8: "PC-first; keep mobile functional but basic" was the MVP call — this would be the first real investment beyond that). Per the working protocol, propose a concrete scope and get approval before touching code, same as M10's planning step. No design work has started on this.

---

## Learned this session

- **This session's own browser-preview tab already had the user's `npm run dev` open with real guest data in it** (two applications, LinkTest Co / Acme Corp) — unlike M9's HANDOFF note, which said the preview browser couldn't verify things needing a real desktop/notification permission. Table view has no such restriction (no `Notification` API involved), so I verified nav-item rendering, live sort-by-company (confirmed the ▲ arrow and correct row order), and the Stage `MultiSelectFilter` dropdown opening directly in this session's own preview pane, not handed off. Don't assume every UI feature needs user hand-off the way M9's push notifications did — check whether the feature actually depends on something the sandbox can't do before deferring verification.
- **`preview_start` failed once** with "Port 5173 is in use by node (PID 7174)" because the user's own `npm run dev` was already running from outside this session. Fix was simply calling `preview_start` again with `{url: "http://localhost:5173"}` instead of `{name: "job-tracker-dev"}` — it attaches to the already-running server rather than trying to start a second one. Worth trying that fallback first if `{name}` fails with a port-in-use error, rather than assuming the dev server needs to be killed/restarted.
- **The `toggleSetValue<T>` helper is now duplicated verbatim in both `ArchiveView.tsx` and `TableView.tsx`.** Deliberate, not an oversight: it's a 9-line closure-free pure function, and extracting it to a shared module for two call sites felt like premature abstraction for this session. Worth revisiting if a third `MultiSelectFilter`-driven view shows up.
- **This session began with a real /continue contradiction worth remembering the shape of, not the content:** the `/continue` skill's stated repo (found via a blind `find` for `PLAN.md`) resolved to `/Users/burak2/Documents/GitHub/job-tracker`, a stale second clone 29 commits behind `origin/main`. The actual working directory for this session (`/Users/burak2/Desktop/Claude`, per the environment block) was a *different* local clone of the same GitHub repo, already at `origin/main` HEAD. Lesson for any future session: if `job-tracker-mvp-brief.md`/`PLAN.md` reads as wildly inconsistent with the git log a prior HANDOFF.md described, check whether you're even in the right clone before assuming the docs are stale — `git remote -v` and comparing `HEAD` against what the environment block's own "Recent commits" list shows is the fast way to catch it.

---

## Open questions

- **Mobile-first polish scope** — not yet designed, see "Next action" above. No urgency expressed by the user either way.
- **Should archiving be reachable from the Table view?** Deliberately left out of M10 (archiving stays board/detail-modal only) and noted in `PLAN.md` as a possible follow-on, not decided either way.
- **Duplicate stale local clone at `/Users/burak2/Documents/GitHub/job-tracker`, 29 commits behind `origin/main`** — flagged to the user mid-session as a heads-up, not yet acted on. Not touched this session (all work happened in the correct up-to-date clone at `/Users/burak2/Desktop/Claude`). Worth asking the user whether that second clone is intentional (e.g. a deliberate second checkout) or leftover cruft to delete.

---

## Verify

```bash
# 1. Typecheck (strict), lint, tests -- expect clean; oxlint prints ONE
#    pre-existing warning about a missing 'handleUndo' dep in Board.tsx.
npx tsc -b --noEmit
npx oxlint
npm test                      # expect: 11 files, 75 tests, all passing

# 2. Working tree -- expect clean, nothing untracked
git status --short

# 3. Everything pushed -- expect EMPTY
git log origin/main..HEAD --oneline

# 4. Most recent commit -- expect 75ece18 (M10 Table view)
git log --oneline -3

# 5. Run locally, then click "Table" in the sidebar (list icon, between
#    the board icon and the archive icon)
npm run dev
```

- **Production:** https://jobtracker.fazare.dev (Cloudflare auto-deploys every push to `main`) — this session's push has not been separately re-checked against production by either me or the user; the Actions tab is worth a glance if anything looks off.
- **Already verified, don't redo:** Table nav item appears and is clickable; the table renders real guest-mode application data with correct columns; clicking the "Company" header sorts ascending (▲ shown, correct row order) and toggles direction on re-click; the "Stage" `MultiSelectFilter` opens with checkboxes reflecting all 4 stages selected. **Also now verified (2026-07-22, follow-up check):** the per-row stage `<select>` actually writes through `moveApplicationStage` — changed LinkTest Co from Applied to Offer via the Table dropdown, confirmed the card moved to the Offer column on the Board view (counts updated: Applied 0, Offer 1), and confirmed via a direct IndexedDB read (`stage_history` object store) that a fresh row was appended (`stage: "offer"`, `entered_at` timestamped at the moment of the change) — not just a `current_stage` update with no history trail. Reverted back to Applied afterward to restore the original guest data. M10 is now fully verified end-to-end; no outstanding verification gap.
