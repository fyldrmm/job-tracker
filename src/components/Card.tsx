import { useRef } from 'react'
import { useDraggable } from '@dnd-kit/core'
import type { Application } from '../types/application'
import { formatDate } from '../lib/format'

interface CardProps {
  application: Application
  onOpenDetail: () => void
  onAdvance: () => void
}

const CLICK_DELAY_MS = 250

export function Card({ application, onOpenDetail, onAdvance }: CardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: application.id,
  })
  const clickTimer = useRef<number | null>(null)

  // Single click opens the detail view; a second click within the window
  // advances the stage instead, mirroring what a drag would do — a
  // trackpad-friendly alternative to dragging.
  function handleClick() {
    if (clickTimer.current !== null) {
      window.clearTimeout(clickTimer.current)
      clickTimer.current = null
      onAdvance()
      return
    }
    clickTimer.current = window.setTimeout(() => {
      clickTimer.current = null
      onOpenDetail()
    }, CLICK_DELAY_MS)
  }

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      style={style}
      className={`w-full text-left bg-white rounded-md border border-slate-200 p-3 shadow-sm hover:shadow-md hover:border-slate-300 transition cursor-grab active:cursor-grabbing focus:outline-none focus:ring-2 focus:ring-slate-400 ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div className="font-medium text-slate-800 text-sm truncate">{application.company}</div>
      <div className="text-slate-600 text-sm truncate">{application.role_title}</div>
      <div className="text-slate-400 text-xs mt-1">{formatDate(application.date_applied)}</div>
    </div>
  )
}
