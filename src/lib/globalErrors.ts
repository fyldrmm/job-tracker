// Surfaces failures that escape every try/catch in the app -- uncaught
// throws from event handlers and timers, and unhandled promise
// rejections. Deliberately local-only (AUDIT.md C4): the console is the
// full-fidelity diagnostic channel, plus at most a rare generic toast so
// the user knows to reload. No remote sink, no third-party SDK -- adding
// one would mean disclosing a new data processor, undoing part of what
// the H2 privacy-policy fix just did.
//
// Module-level pub/sub rather than React context: there are zero
// contexts anywhere in this codebase, there is exactly one consumer
// (Board), and the producer isn't in the React tree at all (it's
// `window`) -- a provider would buy nothing here. Matches the existing
// singleton style of src/lib/db.ts and localStore.ts.

// Deliberately generic. A global error is NOT evidence that a save
// failed, so this must not claim one did -- Board's own showError()
// already shows the real err.message for known-shape operations where
// that's actually informative; this is not that. Same reassuring tone as
// ErrorBoundary's fallback copy.
export const GLOBAL_ERROR_MESSAGE =
  'Something went wrong in the background. Your data is safe -- reload if anything looks out of date.'

// Longer than Board's ERROR_WINDOW_MS (8s) so a repeat can never re-arm
// the toast while it's still on screen -- no flicker, no stacking.
const THROTTLE_MS = 10000

// A runaway loop (a throwing interval, a retry storm) must not nag
// forever; past this many notices we go console-only for the page's life.
const MAX_NOTICES_PER_PAGE = 3

type Listener = (message: string) => void

const listeners = new Set<Listener>()
let lastNoticeAt = 0
let noticeCount = 0
let pendingMessage: string | null = null

// Known-benign noise that must never reach the user -- this list is the
// load-bearing part of the whole module. Toasting on someone else's bug
// (a browser extension, a spec-compliant ResizeObserver notification)
// makes THIS app look broken. If in doubt, widen this list, don't
// narrow it.
function isIgnorable(error: unknown, message: string): boolean {
  // Fires whenever layout changes inside a ResizeObserver callback.
  // Harmless per spec, and dnd-kit leans on ResizeObserver all over the
  // board -- this alone would make the app feel broken when it isn't.
  if (message.includes('ResizeObserver loop')) return true
  // Cross-origin opaque error: no stack, no detail, and in practice
  // almost always a browser extension running on the user's page.
  if (message === 'Script error.' && !error) return true
  // A deliberately aborted fetch/task is not a failure.
  if (
    typeof error === 'object' &&
    error !== null &&
    (error as { name?: string }).name === 'AbortError'
  ) {
    return true
  }
  return false
}

function report(error: unknown, message: string, context: string) {
  // Never throttled -- the console is where the real diagnosis happens.
  console.error(`[global] ${context}`, error ?? message)

  if (isIgnorable(error, message)) return
  if (noticeCount >= MAX_NOTICES_PER_PAGE) return
  const now = Date.now()
  if (now - lastNoticeAt < THROTTLE_MS) return
  lastNoticeAt = now
  noticeCount += 1

  if (listeners.size === 0) {
    // Nothing is mounted yet (boot-time failure). Hold it for the first
    // subscriber rather than dropping it on the floor.
    pendingMessage = GLOBAL_ERROR_MESSAGE
    return
  }
  for (const listener of listeners) listener(GLOBAL_ERROR_MESSAGE)
}

function handleError(event: ErrorEvent) {
  // No target check here: resource-load failures (<img>, <script>,
  // <link>) don't bubble, so this non-capturing window listener never
  // sees them regardless -- a target guard would be dead code as long as
  // this stays non-capturing. (An identity check (`event.target !==
  // window`) was tried and removed: it's fragile across module/test
  // boundaries -- Vitest's jsdom environment can bind `window` inside a
  // module differently from the `window` an event actually dispatches
  // against, so the check silently discarded every event in tests. If
  // `{ capture: true }` is ever added here, don't reach for identity
  // comparison again -- use `event.target instanceof HTMLElement`.)
  report(event.error, event.message ?? '', 'uncaught error')
}

function handleRejection(event: PromiseRejectionEvent) {
  const reason = event.reason
  const message = reason instanceof Error ? reason.message : String(reason ?? '')
  report(reason, message, 'unhandled promise rejection')
}

// Idempotent: addEventListener de-dupes an identical (type, listener,
// capture) triple, so calling this twice installs one of each.
export function installGlobalErrorHandlers(): () => void {
  window.addEventListener('error', handleError)
  window.addEventListener('unhandledrejection', handleRejection)
  return () => {
    window.removeEventListener('error', handleError)
    window.removeEventListener('unhandledrejection', handleRejection)
  }
}

export function subscribeToGlobalErrors(listener: Listener): () => void {
  listeners.add(listener)
  if (pendingMessage !== null) {
    const message = pendingMessage
    // Deliver once -- StrictMode's re-subscribe must not replay it.
    pendingMessage = null
    listener(message)
  }
  return () => {
    listeners.delete(listener)
  }
}

// Test-only: this module's state is a singleton and would otherwise leak
// between test cases.
export function resetGlobalErrorsForTest() {
  listeners.clear()
  lastNoticeAt = 0
  noticeCount = 0
  pendingMessage = null
}
