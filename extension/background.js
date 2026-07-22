// Service worker: does the actual scrape + tab handling, triggered by a
// one-shot message from popup.js. Wire contract (message shape, source
// marker) is shared with src/lib/extensionHandoff.ts on the web-app side --
// kept manually in sync since this extension has no build step and can't
// import from the app's TypeScript source.
const MESSAGE_SOURCE = 'jobtracker-extension'
// Mirrors MAX_EXTRACTION_TEXT_CHARS in src/lib/extensionHandoff.ts (which
// itself mirrors the Edge Function's MAX_TEXT_CHARS). The app truncates and
// the server re-checks too, so this is just avoiding sending a payload
// that's already known to be oversized.
const MAX_TEXT_CHARS = 20000

const TRACKER_URL_PATTERNS = ['https://jobtracker.fazare.dev/*', 'http://localhost:5173/*']
const TRACKER_DEFAULT_URL = 'https://jobtracker.fazare.dev/'

// Runs INSIDE the target page via chrome.scripting.executeScript -- must be
// self-contained (no closures over this file's outer scope).
function scrapePageText() {
  return document.body ? document.body.innerText : ''
}

async function findTrackerTab() {
  const tabs = await chrome.tabs.query({ url: TRACKER_URL_PATTERNS })
  return tabs[0] ?? null
}

async function openOrFocusTrackerTab() {
  const existing = await findTrackerTab()
  if (existing?.id) {
    await chrome.tabs.update(existing.id, { active: true })
    if (existing.windowId != null) await chrome.windows.update(existing.windowId, { focused: true })
    return existing
  }
  return chrome.tabs.create({ url: TRACKER_DEFAULT_URL })
}

// Delivers the payload directly to an already-open, already-loaded tracker
// tab (content-bridge.js is listening). A freshly created tab won't have
// its content script ready yet -- chrome.storage.session (set by the
// caller before this runs) is the fallback path content-bridge.js reads on
// its own load, so a few retries here are just for the "tab was already
// open but is mid-navigation" edge case, not the primary delivery path for
// new tabs.
async function sendToTab(tabId, payload, attempt = 0) {
  try {
    await chrome.tabs.sendMessage(tabId, { __jobtrackerHandoff: payload })
  } catch {
    if (attempt < 5) setTimeout(() => sendToTab(tabId, payload, attempt + 1), 500)
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'send-to-tracker') return undefined

  ;(async () => {
    try {
      const tab = await chrome.tabs.get(message.tabId)
      if (!tab.url || !/^https?:/.test(tab.url)) {
        sendResponse({ error: 'This page cannot be read.' })
        return
      }

      const results = await chrome.scripting.executeScript({
        target: { tabId: message.tabId },
        func: scrapePageText,
      })
      const rawText = results[0]?.result ?? ''
      const text = rawText.trim().slice(0, MAX_TEXT_CHARS)

      if (!text) {
        sendResponse({ error: 'No readable text found on this page.' })
        return
      }

      const payload = { source: MESSAGE_SOURCE, type: 'extract', text, sourceUrl: tab.url }

      // Stash first (the fallback path for a freshly created/reloading
      // tab), THEN try direct delivery for a tab that's already open and
      // ready to receive it immediately.
      await chrome.storage.session.set({ pendingHandoff: payload })

      const trackerTab = await openOrFocusTrackerTab()
      if (trackerTab?.id) sendToTab(trackerTab.id, payload)

      sendResponse({ ok: true })
    } catch (err) {
      console.error('jobtracker extension: failed to send', err)
      sendResponse({ error: 'Could not read this page. Please try again.' })
    }
  })()

  return true // keep the message channel open for the async sendResponse above
})
