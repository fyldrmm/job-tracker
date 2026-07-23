import { useEffect, useRef, useState } from 'react'
import type { Tracker } from '../types/application'

interface TrackerTabsProps {
  trackers: Tracker[]
  activeTrackerId: string | null
  onSelect: (id: string) => void
  onCreate: (name: string) => void
  onRename: (id: string, name: string) => void
  onDeleteRequest: (tracker: Tracker) => void
  onReorder: (orderedIds: string[]) => void
}

// A 1x1 transparent GIF used as the drag image. The browser's default drag
// ghost tracks the cursor on both axes, which reads as jittery for a
// strictly horizontal reorder -- suppressing it leaves only the drop-index
// indicator bar as feedback, which we fully control.
const EMPTY_DRAG_IMAGE = new Image()
EMPTY_DRAG_IMAGE.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBTAA7'

export function TrackerTabs({
  trackers,
  activeTrackerId,
  onSelect,
  onCreate,
  onRename,
  onDeleteRequest,
  onReorder,
}: TrackerTabsProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState('')
  const [adding, setAdding] = useState(false)
  const [addingValue, setAddingValue] = useState('')
  const [draggingId, setDraggingId] = useState<string | null>(null)
  // Index (0..trackers.length) the dragged tab would land at if dropped now,
  // i.e. "insert before trackers[dropIndex]". Tab order itself never
  // changes during the drag -- only this indicator moves -- so there's no
  // feedback loop between reordering the list and re-measuring it.
  const [dropIndex, setDropIndex] = useState<number | null>(null)
  const editInputRef = useRef<HTMLInputElement>(null)
  const addInputRef = useRef<HTMLInputElement>(null)
  const tabRefs = useRef(new Map<string, HTMLDivElement>())

  useEffect(() => {
    if (editingId) editInputRef.current?.focus()
  }, [editingId])

  useEffect(() => {
    if (adding) addInputRef.current?.focus()
  }, [adding])

  function startEditing(tracker: Tracker) {
    setEditingId(tracker.id)
    setEditingValue(tracker.name)
  }

  function commitEdit() {
    if (editingId) onRename(editingId, editingValue)
    setEditingId(null)
  }

  function commitAdd() {
    const name = addingValue.trim()
    if (name) onCreate(name)
    setAdding(false)
    setAddingValue('')
  }

  // Only the cursor's x position decides the drop index -- y is ignored
  // entirely, so vertical wobble while dragging can't move the tab off its
  // row or flip the computed index.
  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    if (!draggingId) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    let index = trackers.length
    for (let i = 0; i < trackers.length; i++) {
      const el = tabRefs.current.get(trackers[i].id)
      if (!el) continue
      const rect = el.getBoundingClientRect()
      if (e.clientX < rect.left + rect.width / 2) {
        index = i
        break
      }
    }
    setDropIndex((current) => (current === index ? current : index))
  }

  function endDrag() {
    setDraggingId(null)
    setDropIndex(null)
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    if (draggingId && dropIndex !== null) {
      const fromIndex = trackers.findIndex((t) => t.id === draggingId)
      if (fromIndex !== -1) {
        const copy = [...trackers]
        const [item] = copy.splice(fromIndex, 1)
        const insertAt = dropIndex > fromIndex ? dropIndex - 1 : dropIndex
        copy.splice(insertAt, 0, item)
        onReorder(copy.map((t) => t.id))
      }
    }
    endDrag()
  }

  return (
    <div
      className="flex items-center gap-1 px-6 pt-3 border-b border-ink-200 overflow-x-auto"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {trackers.map((tracker, index) => {
        const isActive = tracker.id === activeTrackerId
        const isEditing = editingId === tracker.id
        const isDragging = draggingId === tracker.id
        return (
          <div key={tracker.id} className="flex items-center shrink-0">
            {draggingId && dropIndex === index && (
              <div className="w-0.5 self-stretch my-1.5 rounded-full bg-ink-400 shrink-0" />
            )}
            {
              // Stays a div rather than becoming a button: the delete "✕" is
              // a button inside it, and buttons cannot nest. The label and
              // the ✕ are sibling buttons instead, so both are
              // keyboard-reachable (AUDIT.md M7).
            }
            <div
              ref={(el) => {
                if (el) tabRefs.current.set(tracker.id, el)
                else tabRefs.current.delete(tracker.id)
              }}
              draggable={!isEditing}
              onDragStart={(e) => {
                setDraggingId(tracker.id)
                setDropIndex(index)
                e.dataTransfer.effectAllowed = 'move'
                e.dataTransfer.setDragImage(EMPTY_DRAG_IMAGE, 0, 0)
              }}
              onDragEnd={endDrag}
              // Padding lives on the child buttons, not here, so the whole
              // tab surface stays clickable now that the label is a button.
              className={`group/tab relative flex items-center rounded-t-md text-sm shrink-0 ${
                isEditing ? 'px-3 py-1.5' : 'cursor-grab active:cursor-grabbing'
              } ${isDragging ? 'opacity-40' : ''} ${
                isActive
                  ? 'bg-ink-50 text-ink-900 font-medium border border-b-0 border-ink-200'
                  : 'text-ink-500 hover:bg-ink-100'
              }`}
              onDoubleClick={() => startEditing(tracker)}
            >
              {isEditing ? (
                <input
                  ref={editInputRef}
                  type="text"
                  maxLength={100}
                  value={editingValue}
                  onChange={(e) => setEditingValue(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitEdit()
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-white border border-ink-300 rounded px-1 text-sm w-32 focus:outline-none focus:ring-1 focus:ring-ink-400"
                />
              ) : (
                <>
                  <button
                    type="button"
                    aria-current={isActive ? 'true' : undefined}
                    onClick={() => onSelect(tracker.id)}
                    className="max-w-[10rem] truncate px-3 py-1.5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink-400 rounded-t-md"
                  >
                    {tracker.name}
                  </button>
                  {trackers.length > 1 && (
                    <button
                      type="button"
                      aria-label={`Delete ${tracker.name}`}
                      onClick={() => onDeleteRequest(tracker)}
                      className="-ml-1.5 pr-3 py-1.5 text-ink-300 hover:text-rose-600 opacity-0 group-hover/tab:opacity-100 focus-visible:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink-400 rounded-t-md transition-opacity"
                    >
                      ✕
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )
      })}

      {draggingId && dropIndex === trackers.length && (
        <div className="w-0.5 self-stretch my-1.5 rounded-full bg-ink-400 shrink-0" />
      )}

      {adding ? (
        <input
          ref={addInputRef}
          type="text"
          maxLength={100}
          value={addingValue}
          onChange={(e) => setAddingValue(e.target.value)}
          onBlur={commitAdd}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitAdd()
            if (e.key === 'Escape') {
              setAdding(false)
              setAddingValue('')
            }
          }}
          placeholder="Tracker name"
          className="ml-1 border border-ink-300 rounded px-2 py-1 text-sm w-36 focus:outline-none focus:ring-1 focus:ring-ink-400"
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          aria-label="Add tracker"
          className="ml-1 text-ink-400 hover:text-ink-700 w-7 h-7 flex items-center justify-center rounded-md hover:bg-ink-100 shrink-0"
        >
          +
        </button>
      )}
    </div>
  )
}
