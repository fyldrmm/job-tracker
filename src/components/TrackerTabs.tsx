import { useEffect, useRef, useState } from 'react'
import type { Tracker } from '../types/application'

interface TrackerTabsProps {
  trackers: Tracker[]
  activeTrackerId: string | null
  onSelect: (id: string) => void
  onCreate: (name: string) => void
  onRename: (id: string, name: string) => void
  onDeleteRequest: (tracker: Tracker) => void
}

export function TrackerTabs({
  trackers,
  activeTrackerId,
  onSelect,
  onCreate,
  onRename,
  onDeleteRequest,
}: TrackerTabsProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState('')
  const [adding, setAdding] = useState(false)
  const [addingValue, setAddingValue] = useState('')
  const editInputRef = useRef<HTMLInputElement>(null)
  const addInputRef = useRef<HTMLInputElement>(null)

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

  return (
    <div className="flex items-center gap-1 px-6 pt-3 border-b border-slate-200 overflow-x-auto">
      {trackers.map((tracker) => {
        const isActive = tracker.id === activeTrackerId
        const isEditing = editingId === tracker.id
        return (
          // Stays a div rather than becoming a button: the delete "✕" is a
          // button inside it, and buttons cannot nest. The label and the ✕
          // are sibling buttons instead, so both are keyboard-reachable
          // (AUDIT.md M7).
          <div
            key={tracker.id}
            // Padding lives on the child buttons, not here, so the whole tab
            // surface stays clickable now that the label is a button.
            className={`group/tab relative flex items-center rounded-t-md text-sm shrink-0 ${
              isEditing ? 'px-3 py-1.5' : ''
            } ${
              isActive
                ? 'bg-slate-50 text-slate-900 font-medium border border-b-0 border-slate-200'
                : 'text-slate-500 hover:bg-slate-100'
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
                className="bg-white border border-slate-300 rounded px-1 text-sm w-32 focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            ) : (
              <>
                <button
                  type="button"
                  aria-current={isActive ? 'true' : undefined}
                  onClick={() => onSelect(tracker.id)}
                  className="max-w-[10rem] truncate px-3 py-1.5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-400 rounded-t-md"
                >
                  {tracker.name}
                </button>
                {trackers.length > 1 && (
                  <button
                    type="button"
                    aria-label={`Delete ${tracker.name}`}
                    onClick={() => onDeleteRequest(tracker)}
                    className="-ml-1.5 pr-3 py-1.5 text-slate-300 hover:text-rose-600 opacity-0 group-hover/tab:opacity-100 focus-visible:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-400 rounded-t-md transition-opacity"
                  >
                    ✕
                  </button>
                )}
              </>
            )}
          </div>
        )
      })}

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
          className="ml-1 border border-slate-300 rounded px-2 py-1 text-sm w-36 focus:outline-none focus:ring-1 focus:ring-slate-400"
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          aria-label="Add tracker"
          className="ml-1 text-slate-400 hover:text-slate-700 w-7 h-7 flex items-center justify-center rounded-md hover:bg-slate-100 shrink-0"
        >
          +
        </button>
      )}
    </div>
  )
}
