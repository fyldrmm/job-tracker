// True when a keyboard event came from somewhere the browser's own editing
// shortcuts belong -- an input, a textarea, a select, or a contenteditable.
export function isTextEntryTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}
