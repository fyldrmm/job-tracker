import { useState } from 'react'
import type { ArchiveReason } from '../types/application'
import { ARCHIVE_REASONS } from '../lib/archive'

interface ArchiveSplitButtonProps {
  onArchive: (reason: ArchiveReason) => void
}

export function ArchiveSplitButton({ onArchive }: ArchiveSplitButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onClick={() => onArchive('rejected')}
        className="px-3 py-2 text-sm font-medium text-white bg-rose-600 rounded-l-md hover:bg-rose-700"
      >
        Archive
      </button>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Choose archive reason"
        aria-haspopup="menu"
        aria-expanded={open}
        className="px-2 py-2 text-white bg-rose-600 rounded-r-md border-l border-rose-500 hover:bg-rose-700"
      >
        ▾
      </button>
      {open && (
        <div
          role="menu"
          className="absolute bottom-full mb-1 left-0 bg-white border border-ink-200 rounded-md shadow-lg py-1 w-40 z-10"
        >
          {ARCHIVE_REASONS.map((reason) => (
            <button
              key={reason.value}
              type="button"
              role="menuitem"
              onClick={() => {
                onArchive(reason.value)
                setOpen(false)
              }}
              className="w-full text-left px-3 py-1.5 text-sm text-ink-700 hover:bg-ink-100"
            >
              {reason.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
