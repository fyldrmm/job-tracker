// Popup script -- runs while the popup is open, closes when it closes. The
// actual scrape/tab-handling logic lives in background.js (a persistent-
// enough service worker) rather than here, since the popup can be torn
// down mid-flow (e.g. focus moves to a newly created tab) before an
// in-popup async chain would finish.

const statusEl = document.getElementById('status')
const sendButton = document.getElementById('send')
const titleEl = document.getElementById('page-title')

let activeTab = null

function setStatus(message, isError) {
  statusEl.textContent = message
  statusEl.className = isError ? 'status error' : 'status'
}

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  activeTab = tab
  if (tab?.title) titleEl.textContent = tab.title
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
    const response = await chrome.runtime.sendMessage({ type: 'send-to-tracker', tabId: activeTab.id })
    if (response?.error) {
      setStatus(response.error, true)
      sendButton.disabled = false
      return
    }
    setStatus('Sent — check the Job Tracker tab.', false)
    window.close()
  } catch {
    setStatus('Something went wrong. Please try again.', true)
    sendButton.disabled = false
  }
})

init()
