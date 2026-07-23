// The receiving half of the browser-extension handoff (milestone B1). The
// extension itself (B2) is a separate codebase not built yet; this file
// defines the wire contract both sides agree on, so B2 has a fixed target
// to build against.
//
// Flow: extension scrapes the current tab's visible text -> opens/focuses
// this app -> a same-origin content-bridge script posts
// {source: EXTENSION_MESSAGE_SOURCE, type: 'extract', text, sourceUrl} into
// the page via window.postMessage. Board.tsx's message listener validates
// it with parseExtensionMessage before acting on it -- postMessage payloads
// are attacker-controlled in general, even though in practice only our own
// content script (scoped to this origin in the extension's manifest) can
// reach this listener.
export const EXTENSION_MESSAGE_SOURCE = 'jobtracker-extension'

// Mirrors the Edge Function's MAX_TEXT_CHARS (supabase/functions/extract-job-details/index.ts)
// -- the server is authoritative and re-checks this; capping here just
// avoids sending a payload we already know will be rejected, same
// duplication pattern as PER_USER_MONTHLY_LIMIT in extraction.ts.
export const MAX_EXTRACTION_TEXT_CHARS = 8000

export interface ExtensionHandoffPayload {
  text: string
  sourceUrl: string | null
  // Pre-truncation length of the scraped page text, as reported by the
  // extension (background.js measures this before its own MAX_TEXT_CHARS
  // slice). Lets the Edge Function tell a genuinely truncated page apart
  // from one that just happens to fit, for the "how many users are hitting
  // the char cap" query -- see 0011_extraction_original_text_chars.sql.
  // Undefined for anything that didn't report it (e.g. an older extension
  // build); not itself trusted for anything security-sensitive, only used
  // as a metrics signal.
  originalTextLength?: number
}

// Validates and normalizes an incoming window.postMessage event's data.
// Returns null for anything that doesn't match the contract -- malformed,
// from a different source, or simply some other message this page happens
// to receive (postMessage has no built-in scoping, so this listener will
// see messages it has no business acting on).
export function parseExtensionMessage(data: unknown): ExtensionHandoffPayload | null {
  if (!data || typeof data !== 'object') return null
  const msg = data as Record<string, unknown>
  if (msg.source !== EXTENSION_MESSAGE_SOURCE || msg.type !== 'extract') return null
  if (typeof msg.text !== 'string' || !msg.text.trim()) return null
  return {
    text: msg.text.slice(0, MAX_EXTRACTION_TEXT_CHARS),
    sourceUrl: typeof msg.sourceUrl === 'string' && msg.sourceUrl ? msg.sourceUrl : null,
    originalTextLength: typeof msg.originalTextLength === 'number' ? msg.originalTextLength : undefined,
  }
}

const PENDING_EXTRACTION_KEY = 'job-tracker:pending-extraction'

// Holds a handoff payload across the sign-in wall (idea 1's decision: the
// extension requires sign-in, since page text can't be extracted from
// without an account). sessionStorage, not localStorage -- this is a
// short-lived intent, not data that should survive past this browser
// session, and it deliberately doesn't survive a sign-up's email-
// confirmation round trip if that lands in a different tab (best-effort,
// same spirit as the extractionsLeft counter being best-effort elsewhere).
export function storePendingExtraction(payload: ExtensionHandoffPayload): void {
  sessionStorage.setItem(PENDING_EXTRACTION_KEY, JSON.stringify(payload))
}

// Reads and always clears -- a stale/malformed entry must not linger to be
// misread as a fresh handoff on some unrelated later sign-in.
export function consumePendingExtraction(): ExtensionHandoffPayload | null {
  const raw = sessionStorage.getItem(PENDING_EXTRACTION_KEY)
  sessionStorage.removeItem(PENDING_EXTRACTION_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    return parseExtensionMessage({ source: EXTENSION_MESSAGE_SOURCE, type: 'extract', ...parsed })
  } catch {
    return null
  }
}
