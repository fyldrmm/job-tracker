// Runs only on the Job Tracker origin (see manifest.json's content_scripts
// match patterns) -- relays a handoff from background.js into the page via
// window.postMessage, which Board.tsx's listener picks up. See
// src/lib/extensionHandoff.ts for the exact payload shape and why the page
// validates both origin and a source marker (postMessage has no built-in
// sender scoping).
//
// Two delivery paths, since the tab can be in different states when a
// handoff arrives:
// 1. Direct runtime message from background.js, for a tab that was already
//    open -- this content script is already loaded and listening.
// 2. chrome.storage.session, read once on load -- for a tab background.js
//    just created for this handoff, where this script wasn't running yet
//    at the moment background.js first tried to message it.

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
