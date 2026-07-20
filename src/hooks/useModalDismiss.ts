import { useEffect } from 'react'

// Escape-to-close for modal dialogs. Backdrop-click is handled inline at
// each modal's root (so text-entry forms can opt out and avoid losing typed
// data on a stray click). Mirrors the Escape handling MultiSelectFilter
// already does for its dropdown.
export function useModalDismiss(onClose: () => void): void {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])
}
