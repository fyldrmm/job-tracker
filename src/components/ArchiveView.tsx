import { useEffect, useMemo, useRef, useState } from 'react'
import type { Application, ArchiveReason, Tracker } from '../types/application'
import { formatDate } from '../lib/format'
import { ARCHIVE_REASON_LABELS, ARCHIVE_REASONS } from '../lib/archive'
import { NoteIcon } from './icons'

interface ArchiveViewProps {
  applications: Application[]
  trackers: Tracker[]
  onBack: () => void
  onCardOpen: (application: Application) => void
  onUnarchive: (application: Application) => void
}

type SortBy = 'date_applied' | 'date_archived' | 'company' | 'notes'

const SORT_LABELS: Record<SortBy, string> = {
  date_applied: 'Date applied',
  date_archived: 'Date archived',
  company: 'Company name',
  notes: 'Notes',
}

const ALL_REASONS = ARCHIVE_REASONS.map((r) => r.value)

function sortApplications(applications: Application[], sortBy: SortBy): Application[] {
  const sorted = [...applications]
  switch (sortBy) {
    case 'date_applied':
      return sorted.sort((a, b) => b.date_applied.localeCompare(a.date_applied))
    case 'date_archived':
      return sorted.sort((a, b) => (b.archived_at ?? '').localeCompare(a.archived_at ?? ''))
    case 'company':
      return sorted.sort((a, b) => a.company.localeCompare(b.company))
    case 'notes': {
      const withNotes = sorted
        .filter((app) => app.notes && app.notes.trim())
        .sort((a, b) => a.company.localeCompare(b.company))
      const withoutNotes = sorted
        .filter((app) => !app.notes || !app.notes.trim())
        .sort((a, b) => a.company.localeCompare(b.company))
      return [...withNotes, ...withoutNotes]
    }
  }
}

function ReasonFilter({
  selected,
  onToggle,
}: {
  selected: Set<ArchiveReason>
  onToggle: (reason: ArchiveReason) => void
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="border border-slate-300 rounded-md px-2 py-1 text-sm text-slate-600 hover:bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-400"
      >
        Reasons ({selected.size})
      </button>
      {open && (
        <div className="absolute right-0 mt-1 bg-white border border-slate-200 rounded-md shadow-lg py-1 w-40 z-10">
          {ARCHIVE_REASONS.map(({ value, label }) => (
            <label
              key={value}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.has(value)}
                onChange={() => onToggle(value)}
                className="rounded border-slate-300"
              />
              {label}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

function ArchiveRow({
  application,
  onCardOpen,
  onUnarchive,
  showTracker,
  trackerName,
}: {
  application: Application
  onCardOpen: (application: Application) => void
  onUnarchive: (application: Application) => void
  showTracker: boolean
  trackerName: string | undefined
}) {
  return (
    <div className="flex items-center justify-between bg-white rounded-md border border-slate-200 p-3">
      <button type="button" onClick={() => onCardOpen(application)} className="text-left flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <div className="font-medium text-slate-800 text-sm truncate">{application.company}</div>
          {application.notes && application.notes.trim() && (
            <NoteIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-label="Has notes" />
          )}
        </div>
        <div className="text-slate-600 text-sm truncate">{application.role_title}</div>
        <div className="text-slate-400 text-xs mt-1">
          {application.archive_reason ? ARCHIVE_REASON_LABELS[application.archive_reason] : ''}
          {' · '}
          {formatDate(application.date_applied)}
          {showTracker && trackerName ? ` · ${trackerName}` : ''}
        </div>
      </button>
      <button
        type="button"
        onClick={() => onUnarchive(application)}
        className="ml-3 px-3 py-1.5 text-sm font-medium text-slate-600 border border-slate-300 rounded-md hover:bg-slate-50 shrink-0"
      >
        Un-archive
      </button>
    </div>
  )
}

export function ArchiveView({ applications, trackers, onBack, onCardOpen, onUnarchive }: ArchiveViewProps) {
  const [groupByTracker, setGroupByTracker] = useState(true)
  const [sortBy, setSortBy] = useState<SortBy>('date_archived')
  const [selectedReasons, setSelectedReasons] = useState<Set<ArchiveReason>>(() => new Set(ALL_REASONS))

  function toggleReason(reason: ArchiveReason) {
    setSelectedReasons((prev) => {
      if (prev.has(reason)) {
        // At least one reason must stay selected -- deselecting the last
        // one would silently hide everything with no way back except
        // re-checking a box that no longer looks checked.
        if (prev.size === 1) return prev
        const next = new Set(prev)
        next.delete(reason)
        return next
      }
      return new Set(prev).add(reason)
    })
  }

  const filteredApplications = useMemo(
    () => applications.filter((app) => !app.archive_reason || selectedReasons.has(app.archive_reason)),
    [applications, selectedReasons],
  )

  const trackerNameById = useMemo(() => new Map(trackers.map((t) => [t.id, t.name])), [trackers])

  const groups = useMemo(() => {
    const byTracker = new Map<string, Application[]>()
    for (const app of filteredApplications) {
      const list = byTracker.get(app.tracker_id) ?? []
      list.push(app)
      byTracker.set(app.tracker_id, list)
    }
    return trackers
      .map((tracker) => ({ tracker, applications: sortApplications(byTracker.get(tracker.id) ?? [], sortBy) }))
      .filter((group) => group.applications.length > 0)
  }, [filteredApplications, trackers, sortBy])

  const flatSorted = useMemo(() => sortApplications(filteredApplications, sortBy), [filteredApplications, sortBy])

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <button
        type="button"
        onClick={onBack}
        className="text-sm font-medium text-slate-600 hover:text-slate-800 mb-4"
      >
        ← Back to board
      </button>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium text-slate-800">Archive</h2>
        {applications.length > 0 && (
          <div className="flex items-center gap-4 text-sm">
            <label className="flex items-center gap-1.5 text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={groupByTracker}
                onChange={(e) => setGroupByTracker(e.target.checked)}
                className="rounded border-slate-300"
              />
              Group by tracker
            </label>
            <label className="flex items-center gap-1.5 text-slate-600">
              Sort by
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="border border-slate-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
              >
                {(Object.keys(SORT_LABELS) as SortBy[]).map((key) => (
                  <option key={key} value={key}>
                    {SORT_LABELS[key]}
                  </option>
                ))}
              </select>
            </label>
            <ReasonFilter selected={selectedReasons} onToggle={toggleReason} />
          </div>
        )}
      </div>

      {applications.length === 0 ? (
        <p className="text-sm text-slate-400">No archived applications yet.</p>
      ) : filteredApplications.length === 0 ? (
        <p className="text-sm text-slate-400">No archived applications match the selected reasons.</p>
      ) : groupByTracker ? (
        <div className="max-w-2xl space-y-6">
          {groups.map(({ tracker, applications: trackerApps }) => (
            <div key={tracker.id}>
              <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
                {tracker.name}
              </h3>
              <div className="space-y-2">
                {trackerApps.map((application) => (
                  <ArchiveRow
                    key={application.id}
                    application={application}
                    onCardOpen={onCardOpen}
                    onUnarchive={onUnarchive}
                    showTracker={false}
                    trackerName={undefined}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="max-w-2xl space-y-2">
          {flatSorted.map((application) => (
            <ArchiveRow
              key={application.id}
              application={application}
              onCardOpen={onCardOpen}
              onUnarchive={onUnarchive}
              showTracker
              trackerName={trackerNameById.get(application.tracker_id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
