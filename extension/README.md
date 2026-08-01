# OfferTrail browser extension (milestone B2)

Sends the job posting you're viewing to OfferTrail so AI can pre-fill the add-application form. This is the sending half of the browser-extension handoff; the receiving half (sign-in wall, extraction call, pre-filled form) shipped in milestone B1 and lives in `src/lib/extensionHandoff.ts` + `Board.tsx`.

Chrome MV3, vanilla JS, no build step — the files here are loaded directly.

## How it works

1. Click the extension icon on a job posting page → the popup shows the page title, a board/stage picker (if signed in and synced — see step 6), a remaining-extractions line, and a "Send to OfferTrail" button.
2. `popup.js` asks `background.js` (the service worker) to do the actual work, since the popup can close mid-flow (e.g. once focus moves to a new tab) before an in-popup async chain would finish. The chosen tracker id / stage go along with this message.
3. `background.js` scrapes the active tab's visible text (`document.body.innerText`, capped at 8,000 chars — mirrors `MAX_EXTRACTION_TEXT_CHARS` in `src/lib/extensionHandoff.ts`), stashes the payload (text + chosen tracker/stage) in `chrome.storage.session`, then opens or focuses an OfferTrail tab.
4. `content-bridge.js`, which only runs on the OfferTrail origin, relays the payload into the page via `window.postMessage` — either immediately (direct runtime message, for a tab that was already open) or on its own load (reading the stashed `chrome.storage.session` entry, for a tab that was just created).
5. OfferTrail's `Board.tsx` receives it: signed-in users get an extraction call + a pre-filled add form (landing in the chosen tracker/stage if sent and still valid, else its existing auto-pick/`applied` defaults); guests hit a sign-in wall, with the payload held and auto-resumed once signed in.
6. Separately, whenever a signed-in user has an OfferTrail tab open, `Board.tsx` pushes a "sync" snapshot (tracker list + this month's extraction quota) via the same `window.postMessage` channel. `content-bridge.js` relays it to `background.js`, which caches it in `chrome.storage.local`. The popup reads that cache on open — there's no live Supabase session inside the popup itself, so this is "as of your last OfferTrail visit," not a live number. With no cache yet (never visited signed in, or signed out), the popup just shows a plain send button and a "sign in to see your boards and quota" hint.

## Permissions, and why each one is needed

- **`activeTab`** — read the current tab's URL/title and inject the scrape script, only for the tab the user explicitly clicked the icon on (not standing access to every tab).
- **`scripting`** — run the scrape function (`chrome.scripting.executeScript`) inside that tab.
- **`storage`** — `chrome.storage.session` handoff between the background worker and the content-bridge script (session-scoped, cleared when the browser closes), plus `chrome.storage.local` for the popup's cached tracker/quota snapshot (persists between browser sessions, same spirit as the app's own best-effort quota display).
- **`host_permissions` for `offertrail.app` and `localhost:5173`** — lets `background.js` read/focus/create tabs at those URLs, and is what the `content_scripts` match pattern restricts the bridge script to. No broader host access than that.

No `tabs` permission — reading matching tabs' URLs is covered by the host permissions above without it.

## Loading it for testing

1. `chrome://extensions` → enable **Developer mode** (top right) → **Load unpacked** → select this `extension/` directory.
2. Visit a real job posting page (or the local dev server for anything you're testing against `localhost:5173`).
3. Click the extension icon → **Send to OfferTrail**.

## Manual QA checklist

This can't be driven from the coding environment — Chrome extension APIs (`chrome.scripting`, `chrome.tabs`, `chrome.storage`, cross-tab messaging) have no meaningful jsdom equivalent, unlike the web-app receive path in B1 (which does have automated coverage). Everything below is yours to verify:

- [ ] Extension loads with no errors on `chrome://extensions`.
- [ ] Popup disables the button and shows a message on a non-`http(s)` page (e.g. `chrome://newtab`).
- [ ] Clicking **Send to OfferTrail** on a real job posting, with no OfferTrail tab open, opens a new tab and lands on the sign-in wall (guest) or a pre-filled add form (signed-in).
- [ ] Same flow with an OfferTrail tab **already open** — it's focused instead of a duplicate tab opening, and still receives the handoff.
- [ ] Guest path: sign in (or sign up) from the wall, confirm the form opens pre-filled afterward with no need to click the extension again.
- [ ] Signed-in path: confirm company/role/etc. fields are actually pre-filled from the real page content, and the job link falls back to the page URL when the model doesn't find one in the text.
- [ ] A page with very little/no visible text (e.g. an image-only posting) shows the popup's "No readable text found" message rather than silently doing nothing.
- [ ] With OfferTrail open and signed in (at least once, so a sync snapshot gets cached), reopening the popup shows a board picker (if you have more than one tracker) and a stage picker, plus a "N of M ... left this month" line.
- [ ] Picking a non-default board/stage and sending lands the new application there, not in the active tracker / "Applied".
- [ ] Renaming or deleting the tracker that was cached, then sending with the popup's (now stale) choice, still lands the application somewhere sane rather than erroring — Board.tsx falls back to its normal auto-pick.
- [ ] Signed out (or never visited OfferTrail signed in on this browser), the popup shows a plain send button with no picker and a "sign in to see your boards and quota" hint, and sending still works.

## Packaging for the Chrome Web Store

`manifest.json` includes the `localhost:5173` host permission for local dev testing — the Web Store review process flags localhost host permissions in a submitted build, so packaging swaps in `manifest.prod.json` (identical, minus the localhost entries) instead.

Run `./package.sh` from this directory. It builds `job-tracker-extension.zip` with `manifest.prod.json` renamed to `manifest.json` at the zip root, ready to upload to the [developer dashboard](https://chrome.google.com/webstore/devconsole).

## Store listing images (`store-assets/`)

Five images, all committed as binary PNGs (not regenerated by any build step):

- `screenshot-1-popup.png`, `screenshot-2-board.png`, `screenshot-3-add-form.png` — 1280x800 listing screenshots.
- `promo-small-440x280.png` — small promo tile.
- `promo-marquee-1400x560.png` — marquee promo tile.

None of these are raw screenshots — each is a composite: a branded dark-green (`ink-*` palette) canvas, the OfferTrail mark/wordmark, a one-line benefit headline, and a real screenshot of the actual app/popup framed in a white card. Plain unbranded screenshots read as generic and got explicitly replaced with this design (2026-08-01) after comparing against other Web Store listings.

**How they were built**, for whoever regenerates these after a UI change:

1. Real screenshots came from driving the actual app, not a mockup. Since the interactive browser tool available in-session can't reliably save full-resolution PNGs to disk, headless Chrome was scripted directly: `puppeteer-core` (installed ad hoc into a scratch dir with `npm install puppeteer-core --no-save` — never added to this repo's `package.json`) pointed at the system's `/Applications/Google Chrome.app`, driving `npm run dev`'s local server (`http://localhost:5173`).
2. The first-time landing gate was bypassed by setting `localStorage['job-tracker:landing-dismissed'] = 'true'` directly (no newsletter form submitted — that would be a real production side effect). A guest tracker ("My Applications") and four fictional demo applications (one per stage) were added through the real UI, same as a user would.
3. The popup screenshot came from loading `popup.html`/`popup.js` directly in headless Chrome with `window.chrome` stubbed out (fake `tabs.query`/`storage.local.get`/`runtime.sendMessage`) so the real, unmodified popup code renders with a populated tracker/stage picker and quota line — not a redrawn imitation of the popup.
4. Each final image is composed by writing an HTML file (branded gradient background, brand mark, headline, a `<div class="card">` with `border-radius` + `box-shadow` containing an `<img>` of the real screenshot, `object-fit: cover`/`contain` to crop out dead space) and screenshotting that HTML at the exact target resolution with headless Chrome. Images must be loaded via `page.goto('file://...')`, not `page.setContent()` — `setContent` leaves the document on an `about:blank`-ish origin where sibling `file://` image loads get silently blocked.
5. The marquee's embedded board image is the **raw, unbranded** board screenshot (step 1-2's output before compositing) — not a screenshot of `screenshot-2-board.png`, which would nest branding inside branding.
6. Promo tiles require 24-bit PNG/JPEG with **no alpha channel**; verify with `sips -g hasAlpha <file>.png` before uploading.

No script from this process is kept in the repo (it was scratch tooling in `/tmp`, discarded after use) — treat this section as the spec to rebuild it from, not a "run this file" pointer.
