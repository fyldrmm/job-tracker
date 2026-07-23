import { useEffect, useLayoutEffect, useRef, useState } from 'react'

export interface ContextMenuItem {
  label: string
  // Leaf items run onSelect and close the menu. A group item instead sets
  // `items` and has no onSelect -- selecting it drills into that submenu in
  // place (see `stack` below) rather than performing an action.
  onSelect?: () => void
  danger?: boolean
  items?: ContextMenuItem[]
}

interface ContextMenuProps {
  x: number
  y: number
  items: ContextMenuItem[]
  onClose: () => void
}

// Generic fixed-position popup menu, opened at an arbitrary point (a
// right-click, or a trigger button's rect) rather than anchored inline like
// MultiSelectFilter's dropdown -- reuses that component's outside-click +
// Escape-with-focus-return pattern since both are non-modal popups.
export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  // Starts off-screen so the clamped position (computed once the menu has
  // real dimensions) is what actually paints -- avoids a one-frame flash at
  // the unclamped (x, y) when that point is near a viewport edge.
  const [style, setStyle] = useState<{ left: number; top: number; visibility: 'hidden' | 'visible' }>({
    left: x,
    top: y,
    visibility: 'hidden',
  })
  // Drill-down stack for grouped items (Move/Archive/Delete instead of one
  // flat list) -- captured once at mount via the initializer, deliberately
  // NOT resynced when the `items` prop changes on later re-renders (the
  // caller rebuilds that array fresh every render), or drilling into a
  // submenu would keep getting reset back to the top level.
  const [stack, setStack] = useState<ContextMenuItem[][]>(() => [items])
  const current = stack[stack.length - 1]

  useLayoutEffect(() => {
    const menu = menuRef.current
    if (!menu) return
    const rect = menu.getBoundingClientRect()
    const left = Math.max(8, Math.min(x, window.innerWidth - rect.width - 8))
    const top = Math.max(8, Math.min(y, window.innerHeight - rect.height - 8))
    setStyle({ left, top, visibility: 'visible' })
    const first = menu.querySelector<HTMLElement>('[role="menuitem"]')
    first?.focus()
  }, [x, y, stack])

  useEffect(() => {
    function handlePointerDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose()
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    function handleScroll() {
      onClose()
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)
    window.addEventListener('scroll', handleScroll, true)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [onClose])

  return (
    <div
      ref={menuRef}
      role="menu"
      style={{ position: 'fixed', left: style.left, top: style.top, visibility: style.visibility }}
      className="z-50 bg-white border border-ink-200 rounded-md shadow-lg py-1 w-48"
    >
      {stack.length > 1 && (
        <button
          type="button"
          role="menuitem"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation()
            setStack((s) => s.slice(0, -1))
          }}
          className="w-full text-left px-3 py-1.5 text-sm text-ink-500 focus:outline-none focus:bg-ink-100 hover:bg-ink-100"
        >
          ← Back
        </button>
      )}
      {current.map((item) => (
        <button
          key={item.label}
          type="button"
          role="menuitem"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            // This menu is rendered inside Card's DOM subtree (just
            // repositioned visually via position: fixed), so without this
            // the click bubbles up to the card's own onClick and re-triggers
            // its click-count debounce -- reopening the detail view ~250ms
            // after selecting an item, since a bare (non-double/triple)
            // click reads as "open."
            event.stopPropagation()
            if (item.items) {
              setStack((s) => [...s, item.items!])
              return
            }
            item.onSelect?.()
            onClose()
          }}
          className={`w-full text-left px-3 py-1.5 text-sm focus:outline-none focus:bg-ink-100 hover:bg-ink-100 ${
            item.danger ? 'text-rose-600' : 'text-ink-700'
          }`}
        >
          {item.label}
          {item.items ? ' ▸' : ''}
        </button>
      ))}
    </div>
  )
}
