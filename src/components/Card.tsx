import { useRef, useState } from 'react'
import { useDraggable } from '@dnd-kit/core'
import type { Application, Interview } from '../types/application'
import { nextStage, prevStage, STAGE_LABELS } from '../lib/stages'
import { isSafeHttpUrl } from '../lib/url'
import { CardVisual } from './CardVisual'
import { ContextMenu, type ContextMenuItem } from './ContextMenu'

interface CardProps {
  application: Application
  nextInterview?: Interview | null
  onOpenDetail: () => void
  onAdvance: () => void
  onRetreat: () => void
  onArchive: () => void
  onDeleteRequest: () => void
  onTogglePriority: () => void
  selected: boolean
  selectionActive: boolean
  onToggleSelect: () => void
  onClearSelection: () => void
  buildBulkMenuItems: () => ContextMenuItem[]
}

const CLICK_DELAY_MS = 250

export function Card({
  application,
  nextInterview,
  onOpenDetail,
  onAdvance,
  onRetreat,
  onArchive,
  onDeleteRequest,
  onTogglePriority,
  selected,
  selectionActive,
  onToggleSelect,
  onClearSelection,
  buildBulkMenuItems,
}: CardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: application.id,
  })
  const clickTimer = useRef<number | null>(null)
  const clickCount = useRef(0)
  const [menuAnchor, setMenuAnchor] = useState<{ x: number; y: number } | null>(null)

  // Same action set the mouse already reaches via right-click/double/triple
  // click and the detail panel -- this is a second entry point to those,
  // not new capability, so nothing here needs new data-layer wiring.
  function buildMenuItems(): ContextMenuItem[] {
    const items: ContextMenuItem[] = [{ label: 'Open', onSelect: onOpenDetail }]
    const next = nextStage(application.current_stage)
    if (next) items.push({ label: `Move to ${STAGE_LABELS[next]}`, onSelect: onAdvance })
    const prev = prevStage(application.current_stage)
    if (prev) items.push({ label: `Move back to ${STAGE_LABELS[prev]}`, onSelect: onRetreat })
    if (application.job_link && isSafeHttpUrl(application.job_link)) {
      items.push({
        label: 'Open job link',
        onSelect: () => window.open(application.job_link!, '_blank', 'noopener,noreferrer'),
      })
    }
    items.push({
      label: application.is_priority ? 'Remove from most wanted' : 'Mark as most wanted',
      onSelect: onTogglePriority,
    })
    items.push({ label: 'Archive', onSelect: onArchive })
    items.push({ label: 'Delete', onSelect: onDeleteRequest, danger: true })
    return items
  }

  function handleContextMenu(event: React.MouseEvent) {
    event.preventDefault()
    setMenuAnchor({ x: event.clientX, y: event.clientY })
  }

  function handleMenuButtonClick(event: React.MouseEvent<HTMLButtonElement>) {
    event.stopPropagation()
    const rect = event.currentTarget.getBoundingClientRect()
    setMenuAnchor({ x: rect.left, y: rect.bottom + 4 })
  }

  // Debounce clicks so we can tell single/double/triple apart: single opens
  // the detail view, double advances a stage (mirrors a forward drag),
  // triple retreats a stage — trackpad-friendly alternatives to dragging.
  // Cmd/Ctrl+click bypasses all of that: it's a selection toggle, resolved
  // synchronously, never counted as a click-to-open. And once anything is
  // selected, a bare click anywhere just clears the selection instead of
  // opening detail -- exiting multi-select is a one-click action, not a
  // second click on top of opening a card you didn't mean to.
  function handleClick(event: React.MouseEvent) {
    if (event.metaKey || event.ctrlKey) {
      onToggleSelect()
      return
    }
    if (selectionActive) {
      onClearSelection()
      return
    }
    clickCount.current += 1
    if (clickTimer.current !== null) {
      window.clearTimeout(clickTimer.current)
    }
    clickTimer.current = window.setTimeout(() => {
      const count = clickCount.current
      clickCount.current = 0
      clickTimer.current = null
      if (count === 1) onOpenDetail()
      else if (count === 2) onAdvance()
      else if (count >= 3) onRetreat()
    }, CLICK_DELAY_MS)
  }

  // Enter, not Space: Space is dnd-kit's KeyboardSensor pickup key, so
  // binding it here would collide with keyboard drag (AUDIT.md M7).
  // listeners.onKeyDown must still run -- it IS the keyboard drag -- so
  // delegate to it rather than replacing it via the spread below.
  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault()
      onOpenDetail()
      return
    }
    listeners?.onKeyDown?.(event)
  }

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onContextMenu={handleContextMenu}
      className={`group relative rounded-md cursor-grab active:cursor-grabbing touch-none focus:outline-none focus:ring-2 focus:ring-ink-400 ${
        isDragging ? 'opacity-30' : ''
      }`}
    >
      <CardVisual application={application} nextInterview={nextInterview} selected={selected} />
      {/* Keyboard/touch-reachable trigger for the same menu right-click
          opens -- right-click alone would be a mouse-only path to Archive/
          Delete, which the brief rules out for anything critical. */}
      <button
        type="button"
        aria-label="More actions"
        aria-haspopup="menu"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={handleMenuButtonClick}
        className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center rounded text-ink-400 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 hover:bg-ink-100 hover:text-ink-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink-400"
      >
        ⋮
      </button>
      {menuAnchor && (
        <ContextMenu
          x={menuAnchor.x}
          y={menuAnchor.y}
          items={selected ? buildBulkMenuItems() : buildMenuItems()}
          onClose={() => setMenuAnchor(null)}
        />
      )}
    </div>
  )
}
