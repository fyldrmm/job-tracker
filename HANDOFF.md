# HANDOFF.md — Job Application Tracker

**Purpose:** Everything the next session needs to continue with zero re-explanation. Read this together with `PLAN.md` (the long-lived source of truth) and `job-tracker-mvp-brief.md` (original spec) — or just run `/continue`, which reads all three in the right order.

---

## Session scope

Built and shipped M11: mobile-first polish, the last item in PLAN.md's "Candidate next milestones." Scoped to three concrete gaps found by reading the code (not a redesign), got user approval before writing code, then verified live in both the browser preview and the iOS Simulator.

---

## Commits this session

```
91fc842 Add M11: tap-to-expand sidebar for touch devices
6c2dd0a Fix touch drag-and-drop on board cards (M11 follow-up)
```

Both pushed to `origin/main` (`git log origin/main..HEAD` empty, confirmed after each push). Nothing stashed, no scratch branches. Working tree clean except this HANDOFF.md/PLAN.md update, about to be committed.

---

## Exact stopping point

**M11 is complete and pushed.** Typechecked (`npx tsc -b --noEmit`, clean), linted (`npx oxlint`, one pre-existing warning only — same as every prior session, see Verify below), tested (75/75 passing, no new tests added — this was CSS/markup only, no new logic to unit-test), and verified live twice: once in the browser preview (sidebar tap-to-expand, confirmed via accessibility tree in a 375×812 viewport), and once in the iOS Simulator on a real touch device (drag-and-drop, both the bug and the fix).

Files touched this session:
- `src/components/icons.tsx` — new `MenuIcon` (three-line hamburger glyph), same `base` SVG props pattern as the other icons.
- `src/components/Sidebar.tsx` — added `useState` for an explicit `expanded` boolean; new toggle button (`MenuIcon`, `aria-expanded`) at the top of the nav; `NavItem` now takes an `expanded` prop and applies `!opacity-100` to override the `opacity-0 group-hover:opacity-100` label classes when expanded is true, so tap-to-expand works independently of `:hover`. Every `NavItem` call site and the two bare `<span>` section labels ("Tracker", "Account") got the same `expanded` wiring.
- `src/components/Card.tsx` — added `touch-none` to the draggable card's className. This was the actual bug fix: cards had no `touch-action` CSS, so touch-dragging a card lost the race to the browser's native scroll gesture before dnd-kit's `PointerSensor` could activate the drag, scrolling the board instead of moving the card. `touch-none` is dnd-kit's own documented fix for PointerSensor + touch.
- `PLAN.md` — new M11 entry in "Current status"; "Candidate next milestones" trimmed (mobile-first polish done, nothing left in that list).

No Supabase manual steps needed — M11 is entirely client-side CSS/markup, no schema or Edge Function changes.

---

## Next action

**No user-agreed next task — PLAN.md's "Candidate next milestones" list is now empty.** The only thing still flagged anywhere in PLAN.md is the unresolved "unexplained data loss in the applications table" investigation (see "Postponed / deferred"), which the user previously chose to move on from (test data only, not blocking). Next session should ask the user what they want to work on rather than assume.

---

## Learned this session

- **The iOS Simulator is the right tool for verifying real touch behavior — the browser-preview tool's drag simulation cannot exercise dnd-kit at all, mouse or touch.** `left_click_drag` (single-shot mouse move, no intermediate events) never generates enough pointer events for dnd-kit's `PointerSensor` (`activationConstraint: distance: 8`) to register a drag — confirmed this on both the pre-fix and (implicitly) unfixed-for-mouse code, so it's a tool limitation, not something this session's changes touched. If a future session needs to verify any drag-and-drop change, use the iOS Simulator's `touch_path` action (multi-point, with `dt_ms` between points), not the browser preview's `left_click_drag`.
- **The iOS Simulator's `control` tool coordinate space is confusing and worth budgeting extra turns for.** The tool reports "coordinate space for tap/swipe: 402x874 points" but screenshots come back at roughly 918×2000 (a ~2.28x scale). In practice, `tap`/`swipe`/`touch_path` coordinates need to be the **screenshot pixel coordinates divided by ~2.28** (i.e. real ≈ image × 0.4378) — not the raw screenshot-pixel values, and not a re-derived scale from any single "successful-looking" tap (a tap can appear to land correctly by coincidence, e.g. hitting a large button, while actually being off for smaller targets). Calibrate once early with a known element (e.g. a full-width button) and stick to the ratio; don't re-guess per tap. Also: the OS accessory bar in Safari (keyboard's up/down/checkmark row) is NOT part of the page content and its exact tap target can be finicky — an errant tap there can trigger Safari's pinch-zoom or pan state, which persists across screenshots until you navigate/reload. If the layout looks unexpectedly zoomed or shifted, don't fight it — just re-`open_url` the same page; guest data in IndexedDB survives the reload.
- **The iOS Simulator panel can crash mid-session** ("Claude Code iOS Simulator is restarting after a crash" → eventually "has stopped retrying after repeated crashes"). When that happens, retrying `attach` in a loop does not help — it explicitly says so. The fix is the user reopening the panel on their end; simply wait for them to say so, then retry `attach` once.
- **Confirmed via code reading, not just assumption, that the two other candidate mobile issues didn't need fixes**: `Column.tsx` already had `w-72 shrink-0` (fixed-width, scrollable columns) and the add-application/edit modals already had `w-full max-w-md` (responsive). Only the sidebar and the card drag turned out to be real gaps. Worth remembering: read the code before assuming a "PC-first" app has N mobile problems — it may have fewer than the milestone brief implies.

---

## Open questions

- **What's next?** No queued milestone. Ask the user.
- **Unexplained data loss in the `applications` table** — still unresolved, still not blocking (test data only), still not being actively investigated. Carried forward unchanged from prior sessions.
- **Duplicate stale local clone at `/Users/burak2/Documents/GitHub/job-tracker`, 29 commits behind `origin/main`** (flagged by a prior session, `/Users/burak2/Desktop/Claude` is confirmed still the correct up-to-date clone) — still not asked about or acted on. Worth raising with the user at some point: intentional second checkout, or leftover cruft to delete?

---

## Verify

```bash
# 1. Typecheck (strict), lint, tests -- expect clean; oxlint prints ONE
#    pre-existing warning about a missing 'handleUndo' dep in Board.tsx
#    (present since before this session, unrelated to M11).
npx tsc -b --noEmit
npx oxlint
npm test                      # expect: 11 files, 75 tests, all passing (unchanged from M10)

# 2. Working tree -- expect clean, nothing untracked
git status --short

# 3. Everything pushed -- expect EMPTY
git log origin/main..HEAD --oneline

# 4. Most recent commits -- expect 6c2dd0a then 91fc842 (M11 drag fix, then M11 sidebar)
git log --oneline -5

# 5. Run locally on a real touch device (phone/tablet) or the iOS Simulator,
#    then: (a) confirm the sidebar expands on tap without needing hover,
#    (b) drag a card between board columns and confirm it moves the card
#    rather than scrolling the page.
npm run dev
```

- **Production:** https://jobtracker.fazare.dev (Cloudflare auto-deploys every push to `main`) — this session's two pushes have not been separately re-checked against production; the Actions tab is worth a glance if anything looks off.
- **Already verified, don't redo:** Sidebar tap-to-expand/collapse confirmed via accessibility tree in a 375×812 browser-preview viewport (independent of mouse hover). Touch drag-and-drop confirmed live in the iOS Simulator (iPhone 17, Safari) both before the fix (card drag scrolled the board instead of moving) and after (card correctly moved from "Applied" to "Eyes on" via a real multi-point touch gesture).
