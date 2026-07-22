# HANDOFF.md — Job Application Tracker

**Purpose:** Everything the next session needs to continue with zero re-explanation. Read this together with `PLAN.md` (the long-lived source of truth) and `job-tracker-mvp-brief.md` (original spec) — or just run `/continue`, which reads all three in the right order.

---

## Session scope

Fixed a stale `HANDOFF.md` left by the prior session, then built and shipped all 4 of the user's proposed features end-to-end: a right-click context menu (idea 3), a manual "most wanted" priority flag (idea 1), and a browser extension for job-detail extraction (idea 2, split into B1 receive-path + B2 the extension itself) — idea 4 (rename trackers) was already shipped pre-session. Closed with an archive pass moving finished milestones out of `PLAN.md` into `PLAN-ARCHIVE.md`.

---

## Commits this session

```
c233a5d Archive finished milestones: permanent-delete + four user-proposed features
ef1bac9 Record B2 as live-verified in PLAN.md: user confirmed end-to-end in fresh Chrome
c57ca07 Add browser extension for job-detail extraction (B2)
9dacb7d Record B1 (extension receive path) as done in PLAN.md
f2f7ab7 Add browser-extension receive path: text extraction + sign-in wall (B1)
febc817 Record most-wanted priority flag (idea 1) as done in PLAN.md
81e51ed Add manual "most wanted" priority flag with accent color (idea 1)
b70878c Record right-click context menu (idea 3) as done in PLAN.md
a6b3c16 Add right-click context menu for fast card actions (idea 3)
9c3aea5 Fix HANDOFF.md to match actual repo state after session continued past prior /handoff
```

All pushed (`git log origin/main..HEAD` empty, confirmed after the final commit). Nothing stashed, no scratch branches. Working tree fully clean.

---

## Exact stopping point

**Nothing is in progress, stubbed, broken, or half-migrated.** Every commit above is complete, typechecked (`npx tsc -b --noEmit`, clean), linted (`npx oxlint`, one pre-existing warning only — see Verify below), tested (61/61 passing), pushed, and — for everything that could be — live-verified by the user. This is a clean boundary with no queued work.

Both Supabase manual steps this session required are **done and user-confirmed**: `0009_priority.sql` run in the dashboard, and `extract-job-details` redeployed with the text-extraction branch (confirmed this session via `curl -sI -X OPTIONS https://fjlmyaamarnjlthbhycx.functions.supabase.co/extract-job-details` returning `x-function-version: extract-job-details@2026-07-22.1`).

The browser extension's manual QA checklist (`extension/README.md`) is also done — user loaded it unpacked in a **fresh** Chrome install (not a pre-configured one) and confirmed a real job posting correctly pre-filled the add-application form end-to-end.

Files/dirs touched this session, for orientation:
- `src/components/ContextMenu.tsx` (new) — generic fixed-position popup menu; right-click or a card's kebab (⋮) button opens it.
- `src/components/Card.tsx` — right-click handler, kebab button, `buildMenuItems()`.
- `src/components/Column.tsx`, `src/components/Board.tsx` — threaded `onArchive`/`onDeleteRequest`/`onTogglePriority` down to `Card`.
- `src/hooks/useApplications.ts` — new `togglePriority(id)`, `is_priority: false` default on create.
- `src/types/application.ts` — `is_priority: boolean` added to `Application`.
- `src/components/CardVisual.tsx` — amber left-border + star icon accent when `is_priority`.
- `src/components/CardDetail.tsx` — star toggle button in the header.
- `src/components/icons.tsx` — new `StarIcon`.
- `supabase/migrations/0009_priority.sql` (new) — `is_priority boolean not null default false`.
- `supabase/functions/extract-job-details/index.ts` — new `{text, sourceUrl}` branch alongside the existing `{imageBase64,mediaType}` one; `FUNCTION_VERSION` bumped to `2026-07-22.1`.
- `src/lib/extensionHandoff.ts` (new) — the `window.postMessage` wire contract, origin+source validated.
- `src/lib/remoteStore.ts` — `extractJobDetailsFromText()`.
- `src/components/ApplicationForm.tsx` — optional `prefill` prop for add-mode.
- `src/components/Board.tsx` — `message` listener, sign-in wall + `sessionStorage`-held payload + `migrationSettled`-gated auto-resume.
- `extension/` (new dir) — `manifest.json`, `popup.html`/`popup.js`, `background.js`, `content-bridge.js`, `README.md`. Chrome MV3, vanilla JS, no build step.
- `PLAN.md` / `PLAN-ARCHIVE.md` — "Permanently delete an application" and "Four user-proposed features" milestones moved from the former into the latter (both were already done before this session's archive pass, except the four-features one which this session finished).

---

## Next action

No queued work. All 4 user-proposed features are shipped and live-verified. `PLAN.md`'s "Current status" → "Next action" line says the same: pick the next milestone or product direction. Two loose threads exist, neither blocking (see `PLAN.md` "Postponed / deferred"):
- **D6 — Anthropic account balance / auto-reload decision**, still genuinely unmade, more relevant now that the extension may raise extraction volume.
- **The "M1, M2, M3, M4, M5, M7 remaining Mediums" / "C2, C4, C5 remaining missing pieces" checklist items under "Codebase audit + remediation"** (`PLAN.md` line ~86-87) — these show as unchecked but `PLAN.md`'s "Current status" text (lines 23-24) claims all of them are done via named batches/commits. This contradiction predates this session (flagged, not investigated, deliberately left alone as out-of-scope for this session's work) — worth a `git log --grep` completeness check against `AUDIT.md`'s finding IDs before trusting either claim.

---

## Learned this session

- **A ContextMenu (or any popup) rendered inside a draggable/clickable card's own DOM subtree still bubbles clicks to the card's handlers, even when visually repositioned via `position: fixed`.** `ContextMenu`'s menu-item clicks weren't calling `stopPropagation()` at first, so selecting a menu item re-triggered `Card`'s click-count debounce and silently reopened the detail view ~250ms later. Fixed with `event.stopPropagation()` in the item's `onClick`. Caught only by manually verifying in the actual browser (ref-based clicks via the Browser pane's `read_page`/`computer` tools) — the original unit tests didn't catch it because they never modeled the DOM-nesting relationship. A regression test now exists (`Board.test.tsx`, "does not reopen the detail view after choosing a context menu action").
- **`Board.tsx`'s `detailApplication` was a one-time snapshot, not derived state.** It was set once when `CardDetail` opened and never updated again, so any mutation applied while the panel stayed open (a stage move via the new context menu, or the new priority toggle) didn't show until the panel was closed and reopened — e.g. moving a card to "Offer" from the context menu while its detail panel was open still showed "Interview" in the panel. Fixed by storing just the id (`detailApplicationId`) and deriving the live object from `applications` by id on every render. This was a real pre-existing bug the new features exposed, not something the features themselves introduced.
- **The Browser pane's `computer` tool coordinate space doesn't reliably match `read_page`'s reported viewport (1280×720) or the screenshot's labeled size (800×450) 1:1** — literal pixel-guessed clicks from a screenshot missed their targets more than once this session (e.g. clicking "Close" or a menu item by eyeballed coordinates). Ref-based clicks (`computer{action, ref}` using a `ref_N` from a fresh `read_page`) were reliable every time; coordinate-guessed clicks were not. Prefer refs going forward, and re-run `read_page` after any DOM change rather than reusing refs across screenshots.
- **A macOS full-disk-access/TCC hiccup can transiently break `ls`/`git` on the whole `~/Desktop` tree**, not just the repo — happened mid-session (all Bash commands returned "Operation not permitted" even for `ls /Users/burak2/Desktop/`), unrelated to anything in this repo. User confirmed the permission grant looked correct in System Settings and a restart of the app hosting the session fixed it. Not a repo issue; if it recurs, restart first before assuming disk corruption or a repo problem.
- **MV3 extension icons must be raster PNGs** — this environment can't reliably produce a bitmap image, so `extension/` ships with no `icons` key in `manifest.json` and Chrome shows its default icon. Documented as a known, non-blocking limitation in `extension/README.md` rather than attempted with a fake/placeholder asset.
- **Chrome extension APIs (`chrome.scripting`, `chrome.tabs`, `chrome.storage`, cross-tab `postMessage`) have no jsdom equivalent**, unlike B1's receive-path code (which does have full unit/integration coverage via a synthetic `message` event, same pattern as the existing C4 global-error test). B2's manual QA checklist in `extension/README.md` was the only way to verify it, and needed a real Chrome browser this environment doesn't have — entirely the user's to run, and it passed on the first try in a fresh Chrome install.

---

## Open questions

- **D6 — Anthropic balance / auto-reload.** Still unmade; see "Next action" above.
- **The audit-checklist contradiction** noted above under "Next action" — needs a `git log --grep` pass against `AUDIT.md`'s finding IDs to resolve, not investigated this session.
- **No custom extension icon.** Not required for function, but cosmetic polish the user may want eventually — see `extension/README.md`'s "Known limitation" section for exactly what to drop in (`icon16.png`/`icon48.png`/`icon128.png` + an `"icons"` block in `manifest.json`).
- **Generic-scrape-only extraction (no per-site LinkedIn/Indeed parsers).** Explicitly agreed as MVP scope with the user, to extend later if the generic `document.body.innerText` approach proves insufficient on any particular site.

---

## Verify

```bash
# 1. Typecheck (strict), lint, tests -- expect clean; oxlint prints ONE
#    pre-existing warning about a missing 'handleUndo' dep in Board.tsx
npx tsc -b --noEmit
npx oxlint
npm test                      # expect: 8 files, 61 tests, all passing

# 2. Working tree -- expect clean, nothing untracked
git status --short

# 3. Everything pushed -- expect EMPTY
git log origin/main..HEAD --oneline

# 4. Most recent commit -- expect c233a5d (docs/archive), with c57ca07
#    "Add browser extension for job-detail extraction (B2)" as the most
#    recent CODE commit further back.
git log --oneline -3

# 5. Confirm the Edge Function redeploy is still live
curl -sI -X OPTIONS https://fjlmyaamarnjlthbhycx.functions.supabase.co/extract-job-details | grep -i x-function-version
#   expect: x-function-version: extract-job-details@2026-07-22.1

# 6. Run locally
npm run dev
```

- **Production:** https://jobtracker.fazare.dev (Cloudflare auto-deploys every push to `main`).
- **Browser extension:** `extension/` — load unpacked via `chrome://extensions` → Developer mode → Load unpacked. See `extension/README.md` for the full manual QA checklist (already run once, passing, by the user this session).
- **Already verified, don't redo:** everything under "Session scope" above — the context menu (right-click + kebab, all actions), the priority flag (both toggle paths, board/detail-panel sync), and the full extension flow (guest sign-in-wall + auto-resume, signed-in direct prefill, already-open-tab focus) were all confirmed live this session, either by Claude in the preview browser or by the user in a real Chrome install.
