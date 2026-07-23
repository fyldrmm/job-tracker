# HANDOFF.md — Job Application Tracker

**Purpose:** Everything the next session needs to continue with zero re-explanation. Read this together with `PLAN.md` (the long-lived source of truth) and `job-tracker-mvp-brief.md` (original spec) — or just run `/continue`, which reads all three in the right order.

---

## Session scope

User asked how to publish `extension/` (the Chrome job-tracker helper) to the Chrome Web Store. Did the mechanical prep — real icons, a prod-safe manifest, a packaging script — then separately answered two Chrome Web Store developer-dashboard questions (a "files outside project render inert" tool limitation discovered along the way, and a trader/non-trader legal declaration). The actual submission is still the user's own work, not started.

## Commits this session

**None yet — everything below is uncommitted.** This is the tail this handoff needs to protect.

## Exact stopping point

All code changes are written and locally verified, but **not committed**. Working tree has:

- Modified: `.gitignore` (added `extension/*.zip`), `extension/README.md` (removed the stale "no custom icon" limitation note, added a "Packaging for the Chrome Web Store" section), `extension/manifest.json` (added `icons` + `action.default_icon` blocks)
- New: `extension/icon-16.png`, `extension/icon-48.png`, `extension/icon-128.png` (rasterized from `public/favicon.svg`), `extension/manifest.prod.json` (same as `manifest.json` minus the `localhost:5173` host permission/content-script match), `extension/package.sh` (executable, builds `extension/job-tracker-extension.zip`)
- Also pre-existing uncommitted changes to `PLAN.md`/`HANDOFF.md` from a prior session's `/handoff` that never got committed before this session started — those are now folded into this same commit since nothing should be left uncommitted across a `/clear`.

`extension/job-tracker-extension.zip` was built once by the user to confirm `package.sh` works, then deleted before commit (it's git-ignored, regenerate anytime with `./package.sh`).

**Not yet done, and not part of this session's code:** the actual Chrome Web Store submission — developer-dashboard account creation ($5 fee), store listing (screenshots, description, category), privacy policy URL, and the trader/non-trader + permission-justification forms. See "Open questions" below.

## Next action

1. Commit the working tree (see Verify section for the exact diff to expect first).
2. If the user is ready to actually submit: they still need a privacy policy URL (nothing drafted this session) and at least one real screenshot before the Web Store listing form can be completed. Ask which is missing before assuming either is ready.

## Learned this session

- **The browser-preview tool cannot execute JS in local files, even ones placed inside the project directory** — tried rendering the favicon SVG to PNG via a canvas `data:` trick in an HTML file navigated to with `file://`. Files *outside* the project directory render as an inert static snapshot (documented tool behavior); what wasn't obvious until tested is that a temp file placed *inside* the project directory (`extension/_icon_render_tmp.html`) still rendered inert — the tool seems to sandbox all local `file://` script execution regardless of location, not just files outside some project root. Don't spend time on this approach again; go straight to a native/Python render path for anything needing local script execution against a file.
- **No `rsvg-convert`/`imagemagick`/`inkscape`/system `cairo` on this machine.** `pip3 install cairosvg` installs fine but fails at import time (`OSError: no library called "cairo-2"`) since it needs the native `libcairo` shared library, not just the Python bindings — installing that would mean `brew install cairo`, a system-level change not worth it for one-off icon generation. Worked around entirely in pure Python/Pillow instead (manually redrew the favicon's 4 shapes — background circle, white rounded rect, green badge circle, checkmark stroke — scaled per target size, 4x supersampled then `Image.LANCZOS`-downsampled for anti-aliasing). This is a reusable trick for future simple-icon needs in this environment: skip SVG rasterization tooling entirely and just redraw simple vector shapes directly with `PIL.ImageDraw` at 4x scale.
- **`python3 -m venv` + that venv's own `pip`, not the system `pip3` directly** — this machine's bare `pip3 install` fails with `error: No virtual environment found; run uv venv...` (pip is shimmed through `uv`). Simplest fix was a disposable local venv (`python3 -m venv iconenv`) rather than fighting the uv/pip interaction; deleted after use, not left behind.
- **Chrome Web Store review flags a submitted manifest's `localhost` host permissions** — this is why `manifest.prod.json` exists as a separate, hand-maintained file rather than a single manifest with conditional entries. There's no build step tying the two together; any future manifest field change (new permission, updated `content_scripts` match, version bump) has to be applied to both files by hand, or the packaged zip will silently ship a stale prod manifest.
- **Chrome Web Store trader/non-trader declaration**: told the user this is an EEA consumer-protection legal classification hinging on whether you're supplying a paid good/service as an ongoing activity — not on profit motive. Since the user plans to add a paywall later (to cover Anthropic/Cloudflare/Supabase costs, not to profit), advised **trader** is the more defensible choice, since charging money for an ongoing service is a commercial transaction from the consumer's side regardless of profit intent. Flagged explicitly that this isn't legal advice and carries real compliance weight (pricing/withdrawal disclosures, possibly business-name/legal-entity info) — the user hasn't confirmed which option they actually selected in the dashboard.

## Open questions

- **Trader vs. non-trader**: recommended trader, but the user hasn't said which they picked. Worth confirming next session before assuming the dashboard flow has moved past that screen.
- **Privacy policy URL**: the Web Store listing needs one (the extension sends page content to `jobtracker.fazare.dev`) — nothing drafted or discussed yet. Needs a fresh ask: does the user want help drafting a short privacy-policy page, or do they already have one?
- **Screenshots**: the listing needs at least one (1280x800 or 640x400) — not produced this session.
- A separate, unrelated forked conversation exists (per the user's own note mid-session: "this conversation is forked... the forked version will wait for verification") — not something this session's code touches, just flagging so a future session doesn't assume it's stale/irrelevant without checking.

## Verify

```bash
git status --short
# expect (before committing):
#  M .gitignore
#  M HANDOFF.md
#  M PLAN.md
#  M extension/README.md
#  M extension/manifest.json
# ?? extension/icon-128.png
# ?? extension/icon-16.png
# ?? extension/icon-48.png
# ?? extension/manifest.prod.json
# ?? extension/package.sh

cat extension/manifest.json
# expect: "icons" block (16/48/128 -> icon-*.png) and "action.default_icon" present,
# host_permissions still includes both jobtracker.fazare.dev and localhost:5173 (this
# is the DEV manifest, localhost is intentional here)

cat extension/manifest.prod.json
# expect: identical to manifest.json except host_permissions/content_scripts have
# ONLY jobtracker.fazare.dev, no localhost entry anywhere

cd extension && ./package.sh && unzip -l job-tracker-extension.zip && rm job-tracker-extension.zip
# expect: 8 files (background.js, content-bridge.js, popup.html, popup.js,
# icon-16.png, icon-48.png, icon-128.png, manifest.json) with manifest.json at the
# zip root being the PROD manifest's content (no localhost string)
```

To see the icon visually: open `extension/icon-128.png` — a white rounded-rect "document" with a green checkmark badge on a dark-green circle background, matching `public/favicon.svg`.
