# HANDOFF.md — Job Application Tracker

**Purpose:** Everything the next session needs to continue with zero re-explanation. Read this together with `PLAN.md` (the long-lived source of truth) and `job-tracker-mvp-brief.md` (original spec) — or just run `/continue`, which reads all three in the right order.

---

## Session scope

Built and shipped M9: follow-up reminders via browser push notifications (auto-triggered on the existing 14-day stale threshold), plus a mid-session follow-on the user requested — a per-card dismiss control for the badge, and a rename of the badge text from "Stale" to "OUTDATED". User live-tested it themselves in their own `npm run dev` and explicitly confirmed "yes it worked".

---

## Commits this session

```
465ab3d Record M9 dismiss-control addition and live-test status in PLAN.md
76d6ab8 Add per-card dismiss for the OUTDATED badge; rename Stale -> OUTDATED
86afb73 Add M9: follow-up reminders via browser push notifications
```

All pushed (`git log origin/main..HEAD` empty, confirmed this session). Nothing stashed, no scratch branches. Working tree fully clean.

---

## Exact stopping point

**Nothing is in progress, stubbed, broken, or half-migrated.** M9 is complete, typechecked (`npx tsc -b --noEmit`, clean), linted (`npx oxlint`, one pre-existing warning only — see Verify below), tested (70/70 passing), pushed, and live-verified by the user in their own browser (not this session's sandboxed preview). This is a clean boundary with no queued work.

No Supabase manual steps were needed this session — M9 is entirely client-side (browser `Notification` API + `localStorage`), no schema changes, no Edge Function changes.

Files/dirs touched this session, for orientation:
- `src/lib/stale.ts` (new) — `STALE_THRESHOLD_DAYS` (14) and `isStale()`/`daysSinceUpdate()`, extracted out of `CardVisual.tsx` so both the badge and the reminder-checker hook share one definition.
- `src/lib/reminders.ts` (new) — `localStorage`-backed state: `getRemindersEnabled`/`setRemindersEnabled` (the toggle preference), `getNotifiedMap`/`setNotifiedMap` (dedup so a stale app is only notified once per `updated_at`), and `getDismissedStaleMap`/`setDismissedStaleMap`/`dismissStale`/`isDismissedStale` (the per-card dismiss, added mid-session).
- `src/hooks/useStaleReminders.ts` (new) — the polling hook (5 min interval + on-mount check), skips archived/dismissed/already-notified apps, batches multiple due apps into one `Notification`, prunes both the notified-map and dismissed-map of dead application ids.
- `src/hooks/useStaleReminders.test.ts` (new) — 7 tests covering crossing detection, dedup, re-notify-after-real-activity, not-yet-stale, archived-skip, disabled-skip, batching. Note: the `MockNotification` class deliberately avoids TS parameter-property syntax (`constructor(public title: string...)`) — that construct fails under this project's `erasableSyntaxOnly` tsconfig flag; `tsc -b`'s incremental build silently didn't catch it on the very first run after the file was created, only on a later full run, so don't trust a single clean `tsc -b` after adding a similar class-with-constructor pattern — worth a second run if anything touches that area again.
- `src/lib/stale.test.ts` (new) — 2 tests for `isStale()` at the threshold boundary.
- `src/components/CardVisual.tsx` — badge renamed "Stale" → "OUTDATED"; added a dismiss ✕ button next to the badge (`onPointerDown`+`onClick` both `stopPropagation()`, same pattern as `Card.tsx`'s existing kebab-menu button, needed because the badge lives inside the draggable/clickable card's DOM subtree). Uses a local `useReducer` force-update since dismissing writes to `localStorage`, which isn't itself reactive.
- `src/components/Sidebar.tsx` — new bell-icon toggle row (own section, not nested under Account) reflecting `remindersEnabled`/`remindersBlocked` state, calling `onToggleReminders`.
- `src/components/icons.tsx` — new `BellIcon`.
- `src/components/Board.tsx` — `remindersEnabled`/`notificationPermission` state, `handleToggleReminders()` (requests `Notification.requestPermission()` only from the real click, not from an effect), wires `useStaleReminders(applications, remindersEnabled && notificationPermission === 'granted')`.
- `PLAN.md` — "Current status" M9 entry, "Out of scope for MVP" line updated (email reminders still out, push shipped), "Candidate next milestones" trimmed to the 2 remaining (alternate views, mobile-first polish).

---

## Next action

User said explicitly: next session tackles **alternate views** (sortable/filterable table or list alongside the Kanban board — see `PLAN.md`'s "Candidate next milestones" for the scoping notes already written, including the `MultiSelectFilter` reuse pointer). Per the working protocol: plan first, wait for approval, then build. No scope has been agreed yet beyond "alternate views" as the topic — the concrete design (which view type, what's sortable/filterable, where it's reachable from) still needs to be proposed and approved at the start of that session.

---

## Learned this session

- **`tsc -b`'s incremental build can mask a real type error on the first run after a new file is added**, then surface it on a later full run with no code change in between. Happened with `useStaleReminders.test.ts`'s original `MockNotification` class (parameter-property constructor syntax, invalid under `erasableSyntaxOnly`) — first `tsc -b --noEmit` right after creating the file reported "No errors found"; a later run (after unrelated edits elsewhere) caught it. Root-caused and fixed (see file list above), but worth a second `tsc -b` pass rather than trusting one clean run when a session adds a new file with class/constructor syntax.
- **Lowering `STALE_THRESHOLD_DAYS` to 0 for live testing is a fast, effective way to let the user self-verify a time-based feature** without waiting real days — the on-mount `check()` in `useStaleReminders` fires immediately on toggle-on, so no need to wait for the 5-minute poll either. Two unit tests (`is false for a recently-updated application`, `does not notify for applications that are not yet stale`) predictably fail while the threshold is at 0 — that's expected, not a regression; they pass again once reverted to 14. Worth reusing this pattern for any future date/threshold-based feature that needs live QA.
- **This session's sandboxed preview browser reports `Notification.permission: 'denied'` by default** and can't be used to see a real OS notification — only UI wiring (toggle state transitions, the permission-request call itself) was verified there, by patching `window.Notification` via `javascript_tool`. Real end-to-end notification firing needed the user's own desktop browser via their own `npm run dev`. If a future session needs to verify browser-notification behavior, plan on handing that off the same way rather than expecting the preview pane to show it.
- **A card-front badge's dismiss/action button needs both `onPointerDown` and `onClick` `stopPropagation()`** when it lives inside `Card.tsx`'s draggable+clickable outer `div` — `onPointerDown` stops dnd-kit's drag pickup, `onClick` stops the click-count debounce that would otherwise open the detail view ~250ms later. This is the same bug class documented in a prior session's HANDOFF for `ContextMenu`; now there are two independent examples of it in this codebase (the kebab-menu button in `Card.tsx`, and the new dismiss button in `CardVisual.tsx`) — treat it as a standing rule for any future interactive element added inside a card, not a one-off fix.

---

## Open questions

- **Alternate views scope** — not yet designed, see "Next action" above.
- **Mobile-first polish** — the other remaining candidate from the 3 flagged 2026-07-22, still not started, no urgency expressed either way.
- **D6 — Anthropic account balance / auto-reload.** Decided 2026-07-22 (leave as-is, see PLAN-ARCHIVE.md) — resurfacing this only because M9's push notifications don't touch the Anthropic API at all (unlike the AI-extraction feature D6 was about), so no new relevance from this session; not a live open question, just noting it's not reopened.
- **No custom extension icon** and **generic-scrape-only extraction** — both carried over from a prior session's open questions, untouched this session, still cosmetic/non-blocking.

---

## Verify

```bash
# 1. Typecheck (strict), lint, tests -- expect clean; oxlint prints ONE
#    pre-existing warning about a missing 'handleUndo' dep in Board.tsx.
#    Run tsc -b TWICE if you've just added a new class/constructor -- see
#    "Learned this session" above about incremental-build masking.
npx tsc -b --noEmit
npx tsc -b --noEmit
npx oxlint
npm test                      # expect: 10 files, 70 tests, all passing

# 2. Working tree -- expect clean, nothing untracked
git status --short

# 3. Everything pushed -- expect EMPTY
git log origin/main..HEAD --oneline

# 4. Most recent commit -- expect 465ab3d (PLAN.md), with 76d6ab8
#    (dismiss control) and 86afb73 (M9 base) further back.
git log --oneline -3

# 5. Run locally
npm run dev
```

- **Production:** https://jobtracker.fazare.dev (Cloudflare auto-deploys every push to `main`).
- **Already verified, don't redo:** M9 end-to-end (toggle → permission prompt → OS notification → dismiss control → badge text) confirmed live by the user in their own browser this session ("yes it worked").
- **To manually re-test M9 quickly:** temporarily set `STALE_THRESHOLD_DAYS` in `src/lib/stale.ts` to `0`, run `npm run dev`, toggle reminders on in the sidebar, grant the permission prompt — a notification should fire almost immediately for any existing non-archived application. Revert to `14` afterward (two unit tests intentionally fail at `0`, as noted above).
