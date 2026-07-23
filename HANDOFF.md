# HANDOFF.md — Job Application Tracker

**Purpose:** Everything the next session needs to continue with zero re-explanation. Read this together with `PLAN.md` (the long-lived source of truth) and `job-tracker-mvp-brief.md` (original spec) — or just run `/continue`, which reads all three in the right order.

---

## Session scope

Built drag-to-reorder for tracker tabs (`TrackerTabs.tsx`), then separately installed the third-party `graphify` CLI/skill and built a code-only knowledge graph of this repo.

## Commits this session

- `60f2822` — Add drag-to-reorder for tracker tabs
- `5279252` — Gitignore graphify-out/

Both pushed to `origin/main`. Nothing stashed, nothing on a scratch branch. `git status` is clean; `HEAD` == `origin/main`.

## Exact stopping point

Both pieces of work are **fully done, tested, and shipped** — this is a clean stopping point, not a mid-task pause.

- **Tracker reorder**: `src/components/TrackerTabs.tsx` — static-layout + drop-index-indicator implementation (see the long note in `PLAN.md`'s "Current status" for why v1 was replaced). `src/hooks/useTrackers.ts` has `reorderTrackers()`. `src/lib/sort.ts` has `byTrackerOrder`. `src/types/application.ts` has the new optional `Tracker.sort_order`. Migration `supabase/migrations/0010_tracker_sort_order.sql` **has been run** against the live Supabase project by the user (confirmed by them mid-session).
- **Graphify**: installed globally (`uv tool install graphifyy`; `uv` itself installed via `brew install uv` this session since system Python was 3.9.6, graphify needs 3.10+). Skill registered globally via `graphify install --platform claude` (wrote `~/.claude/skills/graphify/`, appended to `~/.claude/CLAUDE.md` — outside this repo, so not visible in `git status` here). Graph built code-only (`graphify . --code-only` then `graphify cluster-only .`) at `graphify-out/graph.json`, now gitignored.

No open loose ends in either piece.

## Next action

Nothing queued. Per `PLAN.md`'s postponed-work note, **the next milestone (if any) needs a fresh user ask** — there's no pre-planned next task. If the user doesn't have one, a reasonable prompt: ask whether they want graphify's community labels named (would require setting `GEMINI_API_KEY`/`GOOGLE_API_KEY`), since right now they're generic "Community N" placeholders.

## Learned this session

- **Live-reshuffle drag preview causes real jitter, not just perceived.** The first tracker-reorder implementation recomputed the rendered array on every `dragover` by feeding the *previous* preview array back into `reorder()` as the next input. This is a feedback loop: reordering the DOM mid-drag changes what element is under the cursor, which can trigger another reorder, which moves the DOM again. Small/wobbly mouse movements amplified this into visible flicker. Fix: keep the array static during the entire drag, track only a `dropIndex` (computed from cursor `clientX` against static element midpoints via a ref map), and apply the actual reorder once, on drop. Worth remembering for any future drag-and-drop UI in this repo — don't reshuffle a rendered list from its own previous render's shape.
- **The browser's native HTML5 drag-ghost image tracks the cursor on the y-axis by default**, and there's no CSS/JS way to constrain it to x-only — the only lever is suppressing it entirely via `e.dataTransfer.setDragImage(transparentImage, 0, 0)` and building your own visual feedback (the indicator bar) instead. If a future drag feature needs axis-constrained visual feedback, this is the pattern.
- **This repo's browser-preview tool cannot drive real native drag-and-drop** (confirmed again this session, consistent with the M11 finding for dnd-kit card-dragging). Verifying drag logic requires dispatching synthetic `DragEvent`s via `javascript_tool`'s `javascript_exec`, **with real `await sleep(...)` delays between `dragstart`/`dragover`/`drop`** — React needs an actual tick to re-render and pick up state changes (e.g. `draggingId`) between events; firing all three synchronously in one call stack is a false negative (looks like the feature is broken when it's actually the test harness not yielding to React).
- **`uv tool install` puts binaries in `~/.local/bin`, which is not on PATH by default** on a fresh shell — needed `export PATH="/Users/burak2/.local/bin:$PATH"` per-command this session since we didn't persist a shell-profile change (that would need the user's own doing, not something to script silently into their `.zshrc`).
- **Graphify's own README flags a real footgun for this exact machine**: plain `pip install` (as opposed to `uv tool install`/`pipx`) risks the CLI resolving a different Python interpreter than the one `pip` installed into, causing `ModuleNotFoundError: No module named 'graphify'`. Not hit this session (used `uv tool install`), but worth knowing if a future reinstall goes a different route.
- **User flagged an anomaly worth remembering as a general caution, not specific to graphify**: a repo with 94,204 stars / 9,122 forks after only ~4 months of existence, for a niche dev-tool category, is statistically unusual and worth a heads-up before installing — even when everything else about the repo (real PyPI package, YC-backed, documented, working as advertised) checks out fine, as it did here.
- **User's standing instruction** (saved to Claude's cross-session memory, not `PLAN.md`, since it's a Claude-Code behavior preference not project truth): proactively run `graphify update .` whenever `HEAD` has moved past the graph's last-built commit and a graph-shaped question is about to be answered — don't wait to be asked each time. Memory files: `feedback_graphify_auto_update.md`, `project_graphify_installed.md`.

## Open questions

- Should graphify's community labels be named for real (needs a `GEMINI_API_KEY`/`GOOGLE_API_KEY`, small token cost) or left as generic placeholders indefinitely? Not decided — user hasn't been asked directly.
- No open questions on the tracker-reorder feature — fully resolved, including the mid-session pivot from v1 to v2 based on live user feedback.

## Verify

```bash
git log --oneline -3
# expect: 5279252 Gitignore graphify-out/
#         60f2822 Add drag-to-reorder for tracker tabs
#         9b8bc77 /handoff: session delta -- CSV export, sidebar rename, multi-select+bulk actions shipped and pushed

git status --short
# expect: empty (clean tree)

npx tsc --noEmit -p tsconfig.app.json
# expect: "TypeScript: No errors found"

git rev-parse HEAD
cat graphify-out/GRAPH_REPORT.md | grep "Built from commit"
# expect: both hashes' first 8 chars match (60f28226) -- if they don't,
# the graph is stale relative to HEAD (expected once new commits land;
# just run `graphify update .` before trusting a graph query)
```

To see the tracker-reorder feature live: `npm run dev`, add 2+ trackers via the "+" tab, drag one to reorder — order should persist across a page reload.
