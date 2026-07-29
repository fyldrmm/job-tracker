// Runs only on the OfferTrail origin (see manifest.json's content_scripts
// match patterns) -- bridges background.js and the page in both directions.
// See src/lib/extensionHandoff.ts for the exact payload shapes and why the
// page validates both origin and a source marker (postMessage has no
// built-in sender scoping).
//
// Extraction handoff (extension -> page), two delivery paths since the tab
// can be in different states when a handoff arrives:
// 1. Direct runtime message from background.js, for a tab that was already
//    open -- this content script is already loaded and listening.
// 2. chrome.storage.session, read once on load -- for a tab background.js
//    just created for this handoff, where this script wasn't running yet
//    at the moment background.js first tried to message it.
//
// Sync snapshot (page -> extension): Board.tsx pushes trackers + extraction
// quota via window.postMessage (postExtensionSync) whenever signed in and
// trackers settle; relayed here to background.js's storage cache so the
// popup can read it without its own Supabase session.

const MESSAGE_SOURCE = 'jobtracker-extension'

function postToPage(payload) {
  window.postMessage(payload, window.location.origin)
}

chrome.runtime.onMessage.addListener((message) => {
  if (message?.__jobtrackerHandoff) postToPage(message.__jobtrackerHandoff)
})

chrome.storage.session.get('pendingHandoff').then(({ pendingHandoff }) => {
  if (!pendingHandoff) return
  chrome.storage.session.remove('pendingHandoff')
  postToPage(pendingHandoff)
})

window.addEventListener('message', (event) => {
  if (event.source !== window || event.origin !== window.location.origin) return
  const data = event.data
  if (!data || data.source !== MESSAGE_SOURCE || data.type !== 'sync') return
  chrome.runtime.sendMessage({
    type: 'sync-from-page',
    trackers: Array.isArray(data.trackers) ? data.trackers : [],
    extractionsLeft: data.extractionsLeft,
    extractionLimit: data.extractionLimit,
    isPro: !!data.isPro,
  })
})
