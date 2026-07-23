import { useState } from 'react'
import { ContextMenu, type ContextMenuItem } from './ContextMenu'
import { StarIcon } from './icons'

interface SelectionToolbarProps {
  count: number
  onClear: () => void
  buildMenuItems: () => ContextMenuItem[]
  // Board's bulk most-wanted toggle -- omitted entirely (no star button
  // rendered) by callers that have no equivalent bulk action, e.g. Archive.
  starActive?: boolean
  onToggleStar?: () => void
}

// Second entry point to the same bulk-action list a right-click on a
// selected card already opens (see Card.tsx) -- this one's reachable
// without a mouse-only gesture, and gives visible confirmation that
// multi-select is active.
export function SelectionToolbar({ count, onClear, buildMenuItems, starActive, onToggleStar }: SelectionToolbarProps) {
  const [menuAnchor, setMenuAnchor] = useState<{ x: number; y: number } | null>(null)

  function handleActionsClick(event: React.MouseEvent<HTMLButtonElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    setMenuAnchor({ x: rect.left, y: rect.top })
  }

  return (
    <>
      {/* The bar's own -translate-x-1/2 is a CSS transform, which makes any
          position:fixed descendant position relative to IT instead of the
          viewport -- ContextMenu has to render as a sibling, outside this
          div, or its (x, y) anchor math silently breaks. */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-ink-800 text-white rounded-md shadow-lg px-4 py-3 flex items-center gap-4 z-50">
        {onToggleStar && (
          <button
            type="button"
            onClick={onToggleStar}
            aria-pressed={starActive}
            aria-label={starActive ? 'Remove from most wanted' : 'Mark as most wanted'}
            title={starActive ? 'Remove from most wanted' : 'Mark as most wanted'}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/20"
          >
            <StarIcon
              className={`w-4 h-4 ${starActive ? 'text-amber-400 fill-amber-400' : 'text-white/70 fill-transparent'}`}
            />
          </button>
        )}
        <button
          type="button"
          aria-haspopup="menu"
          onClick={handleActionsClick}
          className="text-sm font-medium bg-white/10 rounded px-3 py-1.5 hover:bg-white/20"
        >
          Actions ▾
        </button>
        <span className="text-sm">{count} selected</span>
        <button type="button" onClick={onClear} className="text-sm font-medium underline hover:no-underline">
          Deselect
        </button>
      </div>
      {menuAnchor && (
        <ContextMenu x={menuAnchor.x} y={menuAnchor.y} items={buildMenuItems()} onClose={() => setMenuAnchor(null)} />
      )}
    </>
  )
}
