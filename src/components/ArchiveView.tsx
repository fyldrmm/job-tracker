import { useEffect, useMemo, useState } from 'react'
import type { Application, ArchiveReason, EmploymentType, Tracker, WorkMode } from '../types/application'
import { formatDate } from '../lib/format'
import { ARCHIVE_REASON_LABELS, ARCHIVE_REASONS } from '../lib/archive'
import { isTextEntryTarget } from '../lib/dom'
import { EMPLOYMENT_TYPE_LABELS, EMPLOYMENT_TYPES, WORK_MODE_LABELS, WORK_MODES } from '../lib/employment'
import { matchesCompanyOrRoleSearch } from '../lib/search'
import { ContextMenu, type ContextMenuItem } from './ContextMenu'
import { NoteIcon, TrashIcon } from './icons'
import { MultiSelectFilter } from './MultiSelectFilter'
import { SelectionToolbar } from './SelectionToolbar'

interface ArchiveViewProps {
  applications: Application[]
  trackers: Tracker[]
  onBack: () => void
  onCardOpen: (application: Application) => void
  onUnarchive: (application: Application) => void
  onDeleteRequest: (applications: Application[]) => void
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

// Shared by all three filters below: deselecting the last remaining option
// would silently hide everything with no way back except re-checking a box
// that no longer looks checked, so at least one must stay selected.
function toggleSetValue<T>(set: Set<T>, value: T): Set<T> {
  if (set.has(value)) {
    if (set.size === 1) return set
    const next = new Set(set)
    next.delete(value)
    return next
  }
  return new Set(set).add(value)
}

function ArchiveRow({
  application,
  onCardOpen,
  onUnarchive,
  onDeleteRequest,
  showTracker,
  trackerName,
  selected,
  selectionActive,
  onToggleSelect,
  onClearSelection,
  buildBulkMenuItems,
}: {
  application: Application
  onCardOpen: (application: Application) => void
  onUnarchive: (application: Application) => void
  onDeleteRequest: (applications: Application[]) => void
  showTracker: boolean
  trackerName: string | undefined
  selected: boolean
  selectionActive: boolean
  onToggleSelect: () => void
  onClearSelection: () => void
  buildBulkMenuItems: () => ContextMenuItem[]
}) {
  const [menuAnchor, setMenuAnchor] = useState<{ x: number; y: number } | null>(null)

  // Same Cmd/Ctrl-click-to-toggle, plain-click-clears-selection pattern as
  // Card.tsx on the board -- consistent multi-select behavior across views.
  function handleClick(event: React.MouseEvent) {
    if (event.metaKey || event.ctrlKey) {
      onToggleSelect()
      return
    }
    if (selectionActive) {
      onClearSelection()
      return
    }
    onCardOpen(application)
  }

  // Only a selected row opens the bulk menu on right-click -- an unselected
  // row has no per-row context menu of its own (Un-archive/Delete are
  // already one plain click away, unlike Card.tsx's board cards where
  // those actions are hidden behind a menu).
  function handleContextMenu(event: React.MouseEvent) {
    if (!selected) return
    event.preventDefault()
    setMenuAnchor({ x: event.clientX, y: event.clientY })
  }

  return (
    <div
      onContextMenu={handleContextMenu}
      className={`flex items-center justify-between rounded-md border p-3 ${
        selected ? 'ring-2 ring-ink-500 border-ink-500 bg-ink-50' : 'border-ink-200 bg-white'
      }`}
    >
      <button type="button" onClick={handleClick} className="text-left flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <div className="font-medium text-ink-800 text-sm truncate">{application.company}</div>
          {application.notes && application.notes.trim() && (
            <NoteIcon className="w-3.5 h-3.5 text-ink-400 shrink-0" aria-label="Has notes" />
          )}
        </div>
        <div className="text-ink-600 text-sm truncate">{application.role_title}</div>
        <div className="text-ink-400 text-xs mt-1">
          {[
            application.archive_reason ? ARCHIVE_REASON_LABELS[application.archive_reason] : null,
            formatDate(application.date_applied),
            application.employment_type ? EMPLOYMENT_TYPE_LABELS[application.employment_type] : null,
            application.work_mode ? WORK_MODE_LABELS[application.work_mode] : null,
            showTracker && trackerName ? trackerName : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </div>
      </button>
      <button
        type="button"
        onClick={() => onUnarchive(application)}
        className="ml-3 px-3 py-1.5 text-sm font-medium text-ink-600 border border-ink-300 rounded-md hover:bg-ink-50 shrink-0"
      >
        Un-archive
      </button>
      <button
        type="button"
        onClick={() => onDeleteRequest([application])}
        aria-label={`Delete ${application.company}`}
        className="ml-2 p-1.5 text-ink-400 rounded-md hover:bg-rose-50 hover:text-rose-600 shrink-0"
      >
        <TrashIcon className="w-4 h-4" />
      </button>
      {menuAnchor && (
        <ContextMenu x={menuAnchor.x} y={menuAnchor.y} items={buildBulkMenuItems()} onClose={() => setMenuAnchor(null)} />
      )}
    </div>
  )
}

export function ArchiveView({
  applications,
  trackers,
  onBack,
  onCardOpen,
  onUnarchive,
  onDeleteRequest,
}: ArchiveViewProps) {
  const [groupByTracker, setGroupByTracker] = useState(true)
  const [sortBy, setSortBy] = useState<SortBy>('date_archived')
  const [selectedReasons, setSelectedReasons] = useState<Set<ArchiveReason>>(() => new Set(ALL_REASONS))
  const [selectedEmploymentTypes, setSelectedEmploymentTypes] = useState<Set<EmploymentType>>(
    () => new Set(EMPLOYMENT_TYPES.map((o) => o.value)),
  )
  const [selectedWorkModes, setSelectedWorkModes] = useState<Set<WorkMode>>(
    () => new Set(WORK_MODES.map((o) => o.value)),
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())

  function clearSelection() {
    setSelectedIds(new Set())
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isTextEntryTarget(event.target)) return
      if (event.key === 'Escape' && selectedIds.size > 0) clearSelection()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedIds])

  function handleBulkUnarchive() {
    const targets = applications.filter((app) => selectedIds.has(app.id))
    clearSelection()
    targets.forEach((app) => onUnarchive(app))
  }

  function handleBulkDeleteRequest() {
    const targets = applications.filter((app) => selectedIds.has(app.id))
    if (targets.length === 0) return
    onDeleteRequest(targets)
  }

  // Only two flat actions (unlike the board's Move/Archive/Delete groups),
  // so no drill-down submenu is needed here.
  function buildBulkMenuItems(): ContextMenuItem[] {
    return [
      { label: 'Un-archive', onSelect: handleBulkUnarchive },
      { label: 'Delete', onSelect: handleBulkDeleteRequest, danger: true },
    ]
  }

  // Applications with no value for a given field (employment_type/work_mode
  // are optional; archive_reason should always be set but this stays
  // defensive) are unaffected by that field's filter -- narrowing by type
  // hides only the applications actually tagged with an unselected type, not
  // ones that were never tagged at all.
  const filteredApplications = useMemo(
    () =>
      applications.filter(
        (app) =>
          (!app.archive_reason || selectedReasons.has(app.archive_reason)) &&
          (!app.employment_type || selectedEmploymentTypes.has(app.employment_type)) &&
          (!app.work_mode || selectedWorkModes.has(app.work_mode)) &&
          matchesCompanyOrRoleSearch(app, searchQuery),
      ),
    [applications, selectedReasons, selectedEmploymentTypes, selectedWorkModes, searchQuery],
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
        className="text-sm font-medium text-ink-600 hover:text-ink-800 mb-4"
      >
        ← Back to board
      </button>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium text-ink-800">Archive</h2>
        {applications.length > 0 && (
          <div className="flex items-center gap-4 text-sm">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search company or role…"
              aria-label="Search company or role"
              className="w-56 px-3 py-1 rounded-md border border-ink-300 text-ink-700 placeholder:text-ink-400 focus:outline-none focus:ring-1 focus:ring-ink-400 bg-white"
            />
            <label className="flex items-center gap-1.5 text-ink-600 cursor-pointer">
              <input
                type="checkbox"
                checked={groupByTracker}
                onChange={(e) => setGroupByTracker(e.target.checked)}
                className="rounded border-ink-300"
              />
              Group by tracker
            </label>
            <label className="flex items-center gap-1.5 text-ink-600">
              Sort by
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="border border-ink-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ink-400"
              >
                {(Object.keys(SORT_LABELS) as SortBy[]).map((key) => (
                  <option key={key} value={key}>
                    {SORT_LABELS[key]}
                  </option>
                ))}
              </select>
            </label>
            <MultiSelectFilter
              label="Reasons"
              options={ARCHIVE_REASONS}
              selected={selectedReasons}
              onToggle={(reason) => setSelectedReasons((prev) => toggleSetValue(prev, reason))}
            />
            <MultiSelectFilter
              label="Employment"
              options={EMPLOYMENT_TYPES}
              selected={selectedEmploymentTypes}
              onToggle={(type) => setSelectedEmploymentTypes((prev) => toggleSetValue(prev, type))}
            />
            <MultiSelectFilter
              label="Work mode"
              options={WORK_MODES}
              selected={selectedWorkModes}
              onToggle={(mode) => setSelectedWorkModes((prev) => toggleSetValue(prev, mode))}
            />
          </div>
        )}
      </div>

      {applications.length === 0 ? (
        <p className="text-sm text-ink-400">No archived applications yet.</p>
      ) : filteredApplications.length === 0 ? (
        <p className="text-sm text-ink-400">No archived applications match the selected filters or search.</p>
      ) : groupByTracker ? (
        <div className="space-y-6">
          {groups.map(({ tracker, applications: trackerApps }) => (
            <div key={tracker.id}>
              <h3 className="text-xs font-medium text-ink-400 uppercase tracking-wide mb-2">
                {tracker.name}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                {trackerApps.map((application) => (
                  <ArchiveRow
                    key={application.id}
                    application={application}
                    onCardOpen={onCardOpen}
                    onUnarchive={onUnarchive}
                    onDeleteRequest={onDeleteRequest}
                    showTracker={false}
                    trackerName={undefined}
                    selected={selectedIds.has(application.id)}
                    selectionActive={selectedIds.size > 0}
                    onToggleSelect={() => toggleSelect(application.id)}
                    onClearSelection={clearSelection}
                    buildBulkMenuItems={buildBulkMenuItems}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
          {flatSorted.map((application) => (
            <ArchiveRow
              key={application.id}
              application={application}
              onCardOpen={onCardOpen}
              onUnarchive={onUnarchive}
              onDeleteRequest={onDeleteRequest}
              showTracker
              trackerName={trackerNameById.get(application.tracker_id)}
              selected={selectedIds.has(application.id)}
              selectionActive={selectedIds.size > 0}
              onToggleSelect={() => toggleSelect(application.id)}
              onClearSelection={clearSelection}
              buildBulkMenuItems={buildBulkMenuItems}
            />
          ))}
        </div>
      )}

      {selectedIds.size > 0 && (
        <SelectionToolbar count={selectedIds.size} onClear={clearSelection} buildMenuItems={buildBulkMenuItems} />
      )}
    </div>
  )
}
