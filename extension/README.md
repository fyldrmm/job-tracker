# Job Tracker browser extension (milestone B2)

Sends the job posting you're viewing to Job Tracker so AI can pre-fill the add-application form. This is the sending half of the browser-extension handoff; the receiving half (sign-in wall, extraction call, pre-filled form) shipped in milestone B1 and lives in `src/lib/extensionHandoff.ts` + `Board.tsx`.

Chrome MV3, vanilla JS, no build step — the files here are loaded directly.

## How it works

1. Click the extension icon on a job posting page → the popup shows the page title and a "Send to Job Tracker" button.
2. `popup.js` asks `background.js` (the service worker) to do the actual work, since the popup can close mid-flow (e.g. once focus moves to a new tab) before an in-popup async chain would finish.
3. `background.js` scrapes the active tab's visible text (`document.body.innerText`, capped at 8,000 chars — mirrors `MAX_EXTRACTION_TEXT_CHARS` in `src/lib/extensionHandoff.ts`), stashes it in `chrome.storage.session`, then opens or focuses a Job Tracker tab.
4. `content-bridge.js`, which only runs on the Job Tracker origin, relays the payload into the page via `window.postMessage` — either immediately (direct runtime message, for a tab that was already open) or on its own load (reading the stashed `chrome.storage.session` entry, for a tab that was just created).
5. Job Tracker's `Board.tsx` receives it: signed-in users get an extraction call + a pre-filled add form; guests hit a sign-in wall, with the payload held and auto-resumed once signed in.

## Permissions, and why each one is needed

- **`activeTab`** — read the current tab's URL/title and inject the scrape script, only for the tab the user explicitly clicked the icon on (not standing access to every tab).
- **`scripting`** — run the scrape function (`chrome.scripting.executeScript`) inside that tab.
- **`storage`** — `chrome.storage.session` handoff between the background worker and the content-bridge script; session-scoped, cleared when the browser closes.
- **`host_permissions` for `jobtracker.fazare.dev` and `localhost:5173`** — lets `background.js` read/focus/create tabs at those URLs, and is what the `content_scripts` match pattern restricts the bridge script to. No broader host access than that.

No `tabs` permission — reading matching tabs' URLs is covered by the host permissions above without it.

## Known limitation: no custom icon

MV3 action icons must be raster PNGs; none is bundled (this build environment can't reliably produce one). Chrome will show a generic default icon. Drop `icon16.png` / `icon48.png` / `icon128.png` into this directory and add an `"icons"` block to `manifest.json` whenever you want a real one — not required for the extension to function.

## Loading it for testing

1. `chrome://extensions` → enable **Developer mode** (top right) → **Load unpacked** → select this `extension/` directory.
2. Visit a real job posting page (or the local dev server for anything you're testing against `localhost:5173`).
3. Click the extension icon → **Send to Job Tracker**.

## Manual QA checklist

This can't be driven from the coding environment — Chrome extension APIs (`chrome.scripting`, `chrome.tabs`, `chrome.storage`, cross-tab messaging) have no meaningful jsdom equivalent, unlike the web-app receive path in B1 (which does have automated coverage). Everything below is yours to verify:

- [ ] Extension loads with no errors on `chrome://extensions`.
- [ ] Popup disables the button and shows a message on a non-`http(s)` page (e.g. `chrome://newtab`).
- [ ] Clicking **Send to Job Tracker** on a real job posting, with no Job Tracker tab open, opens a new tab and lands on the sign-in wall (guest) or a pre-filled add form (signed-in).
- [ ] Same flow with a Job Tracker tab **already open** — it's focused instead of a duplicate tab opening, and still receives the handoff.
- [ ] Guest path: sign in (or sign up) from the wall, confirm the form opens pre-filled afterward with no need to click the extension again.
- [ ] Signed-in path: confirm company/role/etc. fields are actually pre-filled from the real page content, and the job link falls back to the page URL when the model doesn't find one in the text.
- [ ] A page with very little/no visible text (e.g. an image-only posting) shows the popup's "No readable text found" message rather than silently doing nothing.
