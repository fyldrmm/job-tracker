// Popup script -- runs while the popup is open, closes when it closes. The
// actual scrape/tab-handling logic lives in background.js (a persistent-
// enough service worker) rather than here, since the popup can be torn
// down mid-flow (e.g. focus moves to a newly created tab) before an
// in-popup async chain would finish.
//
// Tracker/stage picker + quota line are populated from background.js's
// cached `syncSnapshot` (see content-bridge.js / Board.tsx's
// postExtensionSync) -- the popup has no Supabase session of its own, so
// this is necessarily "as of your last OfferTrail visit," not live.

const statusEl = document.getElementById('status')
const sendButton = document.getElementById('send')
const titleEl = document.getElementById('page-title')
const trackerFieldEl = document.getElementById('tracker-field')
const trackerSelectEl = document.getElementById('tracker-select')
const stageFieldEl = document.getElementById('stage-field')
const stageSelectEl = document.getElementById('stage-select')
const quotaEl = document.getElementById('quota')

let activeTab = null

function setStatus(message, isError) {
  statusEl.textContent = message
  statusEl.className = isError ? 'status error' : 'status'
}

function applySyncSnapshot(snapshot) {
  if (!snapshot) {
    quotaEl.textContent = 'Sign in to OfferTrail to see your boards and quota.'
    return
  }

  if (Array.isArray(snapshot.trackers) && snapshot.trackers.length > 1) {
    trackerSelectEl.innerHTML = ''
    for (const tracker of snapshot.trackers) {
      const option = document.createElement('option')
      option.value = tracker.id
      option.textContent = tracker.name
      trackerSelectEl.appendChild(option)
    }
    trackerFieldEl.hidden = false
  }

  stageFieldEl.hidden = false

  if (typeof snapshot.extractionsLeft === 'number' && typeof snapshot.extractionLimit === 'number') {
    const kind = snapshot.isPro ? '' : 'free '
    quotaEl.textContent = `${snapshot.extractionsLeft} of ${snapshot.extractionLimit} ${kind}AI extractions left this month (as of your last visit).`
  }
}

async function init() {
  const [tab, { syncSnapshot } = {}] = await Promise.all([
    chrome.tabs.query({ active: true, currentWindow: true }).then(([t]) => t),
    chrome.storage.local.get('syncSnapshot'),
  ])
  activeTab = tab
  if (tab?.title) titleEl.textContent = tab.title
  applySyncSnapshot(syncSnapshot)
  // scripting.executeScript can't run on chrome://, the Chrome Web Store,
  // or other extension pages -- disable up front rather than failing after
  // a click.
  if (!tab?.id || !/^https?:/.test(tab.url ?? '')) {
    setStatus('Open a job posting page first.', true)
    sendButton.disabled = true
  }
}

sendButton.addEventListener('click', async () => {
  if (!activeTab?.id) return
  sendButton.disabled = true
  setStatus('Reading page…', false)
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'send-to-tracker',
      tabId: activeTab.id,
      trackerId: trackerFieldEl.hidden ? undefined : trackerSelectEl.value,
      stage: stageFieldEl.hidden ? undefined : stageSelectEl.value,
    })
    if (response?.error) {
      setStatus(response.error, true)
      sendButton.disabled = false
      return
    }
    setStatus('Sent — check the OfferTrail tab.', false)
    window.close()
  } catch {
    setStatus('Something went wrong. Please try again.', true)
    sendButton.disabled = false
  }
})

init()
