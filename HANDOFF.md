# HANDOFF.md — Job Application Tracker

**Purpose:** Everything the next session needs to continue with zero re-explanation. Read this together with `PLAN.md` (the long-lived source of truth) and `job-tracker-mvp-brief.md` (original spec) — or just run `/continue`, which reads all three in the right order.

---

## Session scope

Built M12 (a new "Insights" page with 7 charts), then — prompted by the user spotting a real correctness bug in it — ran a 5-stage correctness audit of the Insights math, one stage per commit. Closed the session by re-verifying the whole thing live on `jobtracker.fazare.dev`.

---

## Commits this session

```
cfbbc45 Add M12: Insights page, with a two-stage fix for stage-history reliability
4eaada2 M12 Stage 3: zero-fill gap months in the applications-over-time chart
ae2b170 M12 Stage 4: exclude fresh apps from the response-rate denominator
86288e3 M12 Stage 5: anchor stage timing on date_applied, guard bad deltas
```

All 4 pushed to `origin/main` (`8a7c1c9..86288e3`). This handoff's own `PLAN.md`/`PLAN-ARCHIVE.md`/`HANDOFF.md` doc updates are committed and pushed as a 5th commit right after these. Working tree clean, nothing stashed, no scratch branches.

---

## Exact stopping point

**M12 is fully done, shipped, and live-verified on production.** There is no in-progress code and nothing uncommitted. This handoff's own doc edits (below) are committed along with it:

- `PLAN.md` — M12's "Current status" bullet compressed from a ~5-paragraph inline narrative down to a 3-sentence pointer at line 23, linking to the archive. The milestone index bullet (around line 44) got `· M12 Insights page + 5-stage correctness audit (closed 2026-07-23)` appended.
- `PLAN-ARCHIVE.md` — new `### M12 — Insights page + a 5-stage correctness audit of its own math` section inserted just before `## Decisions & notes` (was around line 209 pre-edit), containing the full 5-stage narrative, every decision point, and the recurring recharts gotcha (see below). This is the first time this project's `/handoff` flow has moved a just-finished milestone into the archive in the same session it closed, rather than leaving it in `PLAN.md` indefinitely (which is what happened to M9/M10/M11 — they're still only inline bullets in `PLAN.md`, never given a `###` archive section). Worth a note if a future session wonders why M12 looks structurally different from M9-M11 in the docs.

**Files changed by the session itself** (all committed):
- `src/lib/insights.ts` — new file, the whole computation layer. Key exports: `computeFunnel`, `computeOutcomes`, `computeApplicationsOverTime`, `computeStageTiming`, `computeWorkModeSplit`/`computeEmploymentTypeSplit`, `computeResponseRateBySegment`, `computeTrackerComparison`, `computeKpis`. Internal primitives worth knowing for any future insights work: `stagesOccupied()` (single source of truth for "did this app reach stage X"), `trustedEntries()` (the 30-min dwell-time round-trip filter), `isEligibleForResponseVerdict()` (the 14-day-stale response-rate gate), `nextMonth()` (pure string month arithmetic for zero-filling).
- `src/components/InsightsView.tsx` — new file, all 7 charts + KPI tiles + tracker-scope dropdown, built on `recharts` (new dependency, added to `package.json`).
- `src/hooks/useStageHistory.ts` — new file, read-only `stage_history` loader (guest/signed-in dual-store pattern, mirrors `useApplications`/`useTrackers`).
- `src/hooks/useApplications.ts` — `createApplication` now also writes an initial `stage_history` row (Stage 1's fix).
- `src/components/Board.tsx`, `src/components/Sidebar.tsx`, `src/components/icons.tsx` — wiring: new `'insights'` view state, sidebar nav item, `ChartIcon`.
- `src/lib/insights.test.ts`, `src/hooks/useApplications.test.ts` — new test files. 106 tests total in the suite now (was 75 before this session).

---

## Next action

1. No open milestone. Per `PLAN.md`'s working protocol, the next session needs a fresh user ask before starting new work — there is nothing queued. The usual `/continue` read-through is the right way to start.
2. If the user wants more Insights work: the natural next candidates are (a) a data table / CSV export alongside the charts, (b) more segment cuts (by tracker × stage, e.g.), or (c) surfacing the Insights data on the Board itself as a compact widget. None of these were requested — just the shape of what'd extend cleanly given the current `insights.ts` primitives.

---

## Learned this session

- **A blanket "stage reached" definition (`furthestStageIndex` = max over history) is fundamentally exploitable by any UI that lets a user move things back and forth freely** — this isn't specific to bad code, it's inherent to inferring "genuine progress" from a raw event log with no recorded intent. The fix that worked (`trustedEntries`'s dwell-time filter) only works because reversals are rare and deliberate drags-through-everything are fast; if a future feature ever needs to distinguish "real slow reversal" from "fast exploration" on a *different* signal (not time), this heuristic won't transfer — it's specifically exploiting the fact that real regressions take hours/days and fake ones take seconds.
- **`recharts` + `ResponsiveContainer` has a reproducible transient bug (or at least: reproducible-enough-to-plan-around) where right after a data change, the SVG mounts with zero `<path>`/`<rect>` elements for every bar chart on the page** — confirmed via direct DOM inspection (`querySelectorAll('svg.recharts-surface').length` paths = 0) that it's not a screenshot-timing fluke, it's genuinely empty on first paint. A second screenshot moments later always showed correct bars. Hit this at least 4 separate times across Stages 3, 4, and 5's live verification, always on freshly-added test data, never on a page that had already settled. **Practical rule for future live-checks of any recharts-based UI in this repo: never conclude "broken" from one screenshot showing empty bars — re-screenshot once before investigating.**
- **`isStale`/`daysSinceUpdate` (`src/lib/stale.ts`) calls `Date.now()` directly**, so any test exercising staleness-dependent logic (this session added several to `insights.test.ts` for Stage 4) has to build fixtures with real wall-clock-relative offsets (`new Date(Date.now() - N * 86400000).toISOString()`), same pattern already established in `useStaleReminders.test.ts`. Not new, but worth remembering before reaching for a mocking library — this codebase's convention is real-time-relative fixtures, not `vi.useFakeTimers()`.
- **The Table view's stage `<select>` is a reliable stand-in for board drag-and-drop when testing in the browser-preview tool.** dnd-kit genuinely can't be exercised by this tool's synthetic mouse events (documented back in M11's HANDOFF), but the Table dropdown calls the exact same `moveApplicationStage` and writes identical `stage_history` rows — used it throughout this session (including to reproduce the user's original round-trip bug report) instead of fighting the drag simulation.
- **Port 5173 kept getting claimed by an untracked `node` process** (not started via this tool's `preview_start`) at least 3 times this session — always turned out to be a leftover `vite` dev server from an earlier turn in the *same* session that the preview tool had lost track of after a `preview_stop`/restart cycle. Fix each time was `lsof -i :5173 -sTCP:LISTEN -n -P` → `kill <pid>` → retry `preview_start`. Not a data-loss risk (it's always this same project's own dev server), just a recurring friction point worth trying `preview_list` on first, before assuming a kill is needed.

---

## Open questions

None outstanding from this session — every decision point (funnel semantics, the round-trip fix approach, the response-rate eligibility rule) was explicitly asked and answered by the user, recorded in `PLAN-ARCHIVE.md`'s new M12 section with the alternatives that were rejected. No ambiguity was left for a future session to resolve.

One soft option worth surfacing next time rather than a real question: Stage 2's round-trip fix used the dwell-time heuristic (option "B"); the alternative discussed but not built was a "Moved — Undo" toast mirroring the existing archive-undo pattern, which would fix the misclick-correction case at the source instead of via a heuristic. Not needed now — B is working and live-verified — but if the dwell-time approach ever produces a wrong-feeling number in real usage, that's the fallback to revisit.

---

## Verify

```bash
npx tsc --noEmit -p tsconfig.app.json   # expect: "TypeScript: No errors found"
npx oxlint                               # expect: only the pre-existing Board.tsx:293 exhaustive-deps warning
npm test -- --run                        # expect: 106 tests passed (up from 75 at session start)
git log --oneline -6                     # expect the /handoff doc commit at top, 86288e3 just below it, origin/main matching
git status                               # expect: clean
```

Visual check (already done this session, but re-confirm if picking this up much later):
```bash
open https://jobtracker.fazare.dev
```
Expect: an "Insights" item in the sidebar (bar-chart icon, between Archived and the support/reminders icons). Clicking it shows a tracker-scope dropdown, 4 KPI tiles, and 7 charts. If you add a test application and move it through stages via the Table view's stage dropdown, the funnel/KPIs should update to match — reached-interview/reached-offer percentages should never inflate from a same-session drag-everywhere-and-back (the round-trip fix), and a fresh same-day app should stay out of the response-rate denominator (the Stage 4 fix) until it's either interviewed, archived, or 14+ days old.
