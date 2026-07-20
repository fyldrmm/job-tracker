// True only for values that parse as an absolute http/https URL. Used to
// decide whether a user-supplied (or AI-extracted) job_link is safe to
// render as a clickable anchor -- an <input type="url"> still accepts
// javascript: URLs, so without this check a stored javascript: value would
// become a self-XSS vector. Anything that fails this renders as plain text.
export function isSafeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}
