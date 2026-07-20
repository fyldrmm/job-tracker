import { useRef } from 'react'
import { useDraggable } from '@dnd-kit/core'
import type { Application } from '../types/application'
import { CardVisual } from './CardVisual'

interface CardProps {
  application: Application
  onOpenDetail: () => void
  onAdvance: () => void
  onRetreat: () => void
}

const CLICK_DELAY_MS = 250

export function Card({ application, onOpenDetail, onAdvance, onRetreat }: CardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: application.id,
  })
  const clickTimer = useRef<number | null>(null)
  const clickCount = useRef(0)

  // Debounce clicks so we can tell single/double/triple apart: single opens
  // the detail view, double advances a stage (mirrors a forward drag),
  // triple retreats a stage — trackpad-friendly alternatives to dragging.
  function handleClick() {
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
      className={`rounded-md cursor-grab active:cursor-grabbing focus:outline-none focus:ring-2 focus:ring-slate-400 ${
        isDragging ? 'opacity-30' : ''
      }`}
    >
      <CardVisual application={application} />
    </div>
  )
}
