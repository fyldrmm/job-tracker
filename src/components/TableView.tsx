import { useEffect, useMemo, useRef, useState } from 'react'
import type { Application, ApplicationStage, ArchiveReason, EmploymentType, Interview, WorkMode } from '../types/application'
import { formatDate, formatDateTime } from '../lib/format'
import { STAGE_ORDER, STAGE_LABELS } from '../lib/stages'
import { ARCHIVE_REASONS } from '../lib/archive'
import { isTextEntryTarget } from '../lib/dom'
import { EMPLOYMENT_TYPE_LABELS, EMPLOYMENT_TYPES, WORK_MODE_LABELS, WORK_MODES } from '../lib/employment'
import { interviewSummaryForApplication } from '../lib/interviews'
import { sortApplicationsForTable, type SortDirection, type TableSortKey } from '../lib/tableView'
import { matchesCompanyOrRoleSearch } from '../lib/search'
import { buildApplicationsXlsx, triggerXlsxDownload } from '../lib/xlsxExport'
import { ContextMenu, type ContextMenuItem } from './ContextMenu'
import { NoteIcon, StarIcon } from './icons'
import { MultiSelectFilter } from './MultiSelectFilter'
import { SelectionToolbar } from './SelectionToolbar'

interface TableViewProps {
  applications: Application[]
  interviews: Interview[]
  trackerName: string
  onCardOpen: (application: Application) => void
  onStageChange: (application: Application, stage: ApplicationStage) => void
  onTogglePriority: (application: Application) => void
  onBulkMove: (ids: string[], stage: ApplicationStage) => void
  onBulkArchive: (ids: string[], reason: ArchiveReason) => void
  onBulkSetPriority: (ids: string[], value: boolean) => void
  onDeleteRequest: (applications: Application[]) => void
}

const STAGE_OPTIONS = STAGE_ORDER.map((value) => ({ value, label: STAGE_LABELS[value] }))
const ALL_STAGES = STAGE_ORDER

interface ColumnDef {
  key: TableSortKey
  label: string
}

const COLUMNS: ColumnDef[] = [
  { key: 'company', label: 'Company' },
  { key: 'role_title', label: 'Role' },
  { key: 'current_stage', label: 'Stage' },
  { key: 'date_applied', label: 'Date applied' },
]

const RIGHT_COLUMNS: ColumnDef[] = [
  { key: 'location', label: 'Location' },
  { key: 'employment_type', label: 'Employment' },
  { key: 'work_mode', label: 'Work mode' },
]

// Same "don't let the last selection disappear with no way back" rule as
// ArchiveView's filters.
function toggleSetValue<T>(set: Set<T>, value: T): Set<T> {
  if (set.has(value)) {
    if (set.size === 1) return set
    const next = new Set(set)
    next.delete(value)
    return next
  }
  return new Set(set).add(value)
}

export function TableView({
  applications,
  interviews,
  trackerName,
  onCardOpen,
  onStageChange,
  onTogglePriority,
  onBulkMove,
  onBulkArchive,
  onBulkSetPriority,
  onDeleteRequest,
}: TableViewProps) {
  const [sortKey, setSortKey] = useState<TableSortKey>('date_applied')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [exporting, setExporting] = useState(false)
  const [selectedStages, setSelectedStages] = useState<Set<ApplicationStage>>(() => new Set(ALL_STAGES))
  const [selectedEmploymentTypes, setSelectedEmploymentTypes] = useState<Set<EmploymentType>>(
    () => new Set(EMPLOYMENT_TYPES.map((o) => o.value)),
  )
  const [selectedWorkModes, setSelectedWorkModes] = useState<Set<WorkMode>>(() => new Set(WORK_MODES.map((o) => o.value)))
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const selectAllRef = useRef<HTMLInputElement>(null)
  const [menuAnchor, setMenuAnchor] = useState<{ x: number; y: number } | null>(null)

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

  function handleHeaderClick(key: TableSortKey) {
    if (key === sortKey) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDirection('asc')
    }
  }

  // Same "untagged rows are unaffected by a filter" rule as ArchiveView --
  // employment_type/work_mode are optional, so narrowing by one only hides
  // rows actually tagged with an unselected value.
  const filteredApplications = useMemo(
    () =>
      applications.filter(
        (app) =>
          selectedStages.has(app.current_stage) &&
          (!app.employment_type || selectedEmploymentTypes.has(app.employment_type)) &&
          (!app.work_mode || selectedWorkModes.has(app.work_mode)) &&
          matchesCompanyOrRoleSearch(app, searchQuery),
      ),
    [applications, selectedStages, selectedEmploymentTypes, selectedWorkModes, searchQuery],
  )

  const sorted = useMemo(
    () => sortApplicationsForTable(filteredApplications, sortKey, sortDirection),
    [filteredApplications, sortKey, sortDirection],
  )

  // "Select all" only ever reaches for what's actually on screen -- ids
  // filtered/searched out are simply never candidates, whether it's about to
  // select or deselect. Clicking selects exactly the visible set (replacing
  // the prior selection, not merging into it); clicking again when every
  // visible row is already selected clears everything, visible or not.
  const visibleIds = useMemo(() => sorted.map((app) => app.id), [sorted])
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id))
  const someVisibleSelected = visibleIds.some((id) => selectedIds.has(id))

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someVisibleSelected && !allVisibleSelected
    }
  }, [someVisibleSelected, allVisibleSelected])

  function handleToggleSelectAll() {
    if (allVisibleSelected) {
      clearSelection()
    } else {
      setSelectedIds(new Set(visibleIds))
    }
  }

  const selectedApplications = useMemo(
    () => applications.filter((app) => selectedIds.has(app.id)),
    [applications, selectedIds],
  )
  const allSelectedArePriority = selectedApplications.length > 0 && selectedApplications.every((app) => app.is_priority)

  function handleBulkToggleStar() {
    const ids = [...selectedIds]
    clearSelection()
    onBulkSetPriority(ids, !allSelectedArePriority)
  }

  function handleBulkDeleteRequest() {
    if (selectedApplications.length === 0) return
    const targets = selectedApplications
    clearSelection()
    onDeleteRequest(targets)
  }

  // Same 3-group structure as the board's own bulk menu (Move to stage /
  // Archive / Delete) -- most-wanted stays out of it, same as there, since
  // it's the toolbar's star icon instead.
  function buildBulkMenuItems(): ContextMenuItem[] {
    return [
      {
        label: 'Move to stage',
        items: STAGE_ORDER.map((s) => ({
          label: STAGE_LABELS[s],
          onSelect: () => {
            const ids = [...selectedIds]
            clearSelection()
            onBulkMove(ids, s)
          },
        })),
      },
      {
        label: 'Archive',
        items: ARCHIVE_REASONS.map((reason) => ({
          label: reason.label,
          onSelect: () => {
            const ids = [...selectedIds]
            clearSelection()
            onBulkArchive(ids, reason.value)
          },
        })),
      },
      { label: 'Delete', onSelect: handleBulkDeleteRequest, danger: true },
    ]
  }

  async function handleExportXlsx() {
    setExporting(true)
    try {
      const buffer = await buildApplicationsXlsx(sorted, interviews)
      const slug = trackerName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      const date = new Date().toISOString().slice(0, 10)
      triggerXlsxDownload(`jobtracker-${slug}-${date}.xlsx`, buffer)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {applications.length > 0 && (
        <div className="flex items-center gap-3 mb-4 text-sm">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search company or role…"
            aria-label="Search company or role"
            className="w-56 px-3 py-1 rounded-md border border-ink-300 text-ink-700 placeholder:text-ink-400 focus:outline-none focus:ring-1 focus:ring-ink-400 bg-white"
          />
          <MultiSelectFilter
            label="Stage"
            options={STAGE_OPTIONS}
            selected={selectedStages}
            onToggle={(stage) => setSelectedStages((prev) => toggleSetValue(prev, stage))}
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
          <button
            type="button"
            onClick={handleExportXlsx}
            disabled={sorted.length === 0 || exporting}
            className="ml-auto px-3 py-1 rounded-md border border-ink-300 text-ink-700 hover:bg-ink-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {exporting ? 'Exporting…' : 'Export XLSX'}
          </button>
        </div>
      )}

      {applications.length === 0 ? (
        <p className="text-sm text-ink-400">No applications on this tracker yet.</p>
      ) : filteredApplications.length === 0 ? (
        <p className="text-sm text-ink-400">No applications match the selected filters or search.</p>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-ink-200">
              <th className="w-8">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={handleToggleSelectAll}
                  aria-label="Select all rows in view"
                  className="rounded border-ink-300"
                />
              </th>
              <th className="w-8" />
              {COLUMNS.map((column) => (
                <th key={column.key} className="text-left py-2 pr-4">
                  <button
                    type="button"
                    onClick={() => handleHeaderClick(column.key)}
                    className="font-medium text-ink-500 hover:text-ink-700 inline-flex items-center gap-1"
                  >
                    {column.label}
                    {sortKey === column.key && <span aria-hidden="true">{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                  </button>
                </th>
              ))}
              <th className="text-left py-2 pr-4 font-medium text-ink-500">Next interview</th>
              <th className="text-left py-2 pr-4 font-medium text-ink-500">Rounds</th>
              <th className="text-left py-2 pr-4 font-medium text-ink-500">Salary</th>
              {RIGHT_COLUMNS.map((column) => (
                <th key={column.key} className="text-left py-2 pr-4">
                  <button
                    type="button"
                    onClick={() => handleHeaderClick(column.key)}
                    className="font-medium text-ink-500 hover:text-ink-700 inline-flex items-center gap-1"
                  >
                    {column.label}
                    {sortKey === column.key && <span aria-hidden="true">{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((application) => {
              const { nextInterview, roundCount } = interviewSummaryForApplication(interviews, application.id)
              const selected = selectedIds.has(application.id)
              return (
              <tr
                key={application.id}
                onClick={() => onCardOpen(application)}
                onContextMenu={(e) => {
                  // Only a selected row opens the bulk menu -- an unselected
                  // row has no per-row context menu of its own, same rule as
                  // ArchiveRow.
                  if (!selected) return
                  e.preventDefault()
                  setMenuAnchor({ x: e.clientX, y: e.clientY })
                }}
                className={`border-b border-ink-100 cursor-pointer ${selected ? 'bg-ink-50' : 'hover:bg-ink-50'}`}
              >
                <td className="w-8">
                  <input
                    type="checkbox"
                    checked={selected}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => toggleSelect(application.id)}
                    aria-label={`Select ${application.company}`}
                    className="rounded border-ink-300"
                  />
                </td>
                <td className="w-8">
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation()
                      onTogglePriority(application)
                    }}
                    aria-label={application.is_priority ? 'Remove from most wanted' : 'Mark as most wanted'}
                    aria-pressed={application.is_priority}
                    className="p-1 text-ink-300 hover:text-amber-400"
                  >
                    <StarIcon
                      className={`w-4 h-4 ${application.is_priority ? 'text-amber-400 fill-amber-400' : ''}`}
                    />
                  </button>
                </td>
                <td className="py-2 pr-4">
                  <span className="flex items-center gap-1.5 font-medium text-ink-800">
                    {application.company}
                    {application.notes && application.notes.trim() && (
                      <NoteIcon className="w-3.5 h-3.5 text-ink-400 shrink-0" aria-label="Has notes" />
                    )}
                  </span>
                </td>
                <td className="py-2 pr-4 text-ink-600">{application.role_title}</td>
                <td className="py-2 pr-4">
                  <select
                    value={application.current_stage}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => onStageChange(application, e.target.value as ApplicationStage)}
                    className="border border-ink-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ink-400 bg-white"
                  >
                    {STAGE_ORDER.map((stage) => (
                      <option key={stage} value={stage}>
                        {STAGE_LABELS[stage]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-2 pr-4 text-ink-500">{formatDate(application.date_applied)}</td>
                <td className="py-2 pr-4 text-ink-500">
                  {nextInterview ? formatDateTime(nextInterview.scheduled_at) : '—'}
                </td>
                <td className="py-2 pr-4 text-ink-500">{roundCount || '—'}</td>
                <td className="py-2 pr-4 text-ink-500">{application.salary_range || '—'}</td>
                <td className="py-2 pr-4 text-ink-500">{application.location || '—'}</td>
                <td className="py-2 pr-4 text-ink-500">
                  {application.employment_type ? EMPLOYMENT_TYPE_LABELS[application.employment_type] : '—'}
                </td>
                <td className="py-2 pr-4 text-ink-500">
                  {application.work_mode ? WORK_MODE_LABELS[application.work_mode] : '—'}
                </td>
              </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {selectedIds.size > 0 && (
        <SelectionToolbar
          count={selectedIds.size}
          onClear={clearSelection}
          buildMenuItems={buildBulkMenuItems}
          starActive={allSelectedArePriority}
          onToggleStar={handleBulkToggleStar}
        />
      )}
      {menuAnchor && (
        <ContextMenu x={menuAnchor.x} y={menuAnchor.y} items={buildBulkMenuItems()} onClose={() => setMenuAnchor(null)} />
      )}
    </div>
  )
}
